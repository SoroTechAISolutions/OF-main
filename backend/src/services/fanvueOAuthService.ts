// ============================================
// Fanvue OAuth 2.0 Service (with PKCE)
// ============================================

import crypto from 'crypto';
import { query, pool } from '../db/connection';

// Fanvue OAuth Configuration
const FANVUE_CONFIG = {
  clientId: process.env.FANVUE_CLIENT_ID || '',
  clientSecret: process.env.FANVUE_CLIENT_SECRET || '',
  authUrl: process.env.FANVUE_AUTH_URL || 'https://auth.fanvue.com/oauth2/auth',
  tokenUrl: process.env.FANVUE_TOKEN_URL || 'https://auth.fanvue.com/oauth2/token',
  redirectUri: process.env.FANVUE_REDIRECT_URI || '',
  scopes: process.env.FANVUE_SCOPES || 'read:self read:chat write:chat read:fan read:insights',
  apiBaseUrl: process.env.FANVUE_API_BASE_URL || 'https://api.fanvue.com',
  apiVersion: process.env.FANVUE_API_VERSION || '2025-06-26'
};

// PKCE state storage (in-memory for now, should use Redis in production)
const pkceStore: Map<string, { codeVerifier: string; modelId: string; expiresAt: number }> = new Map();

/**
 * Generate PKCE code verifier (43-128 chars, URL-safe)
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge (SHA256 hash of verifier)
 */
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate random state for CSRF protection
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Clean up expired PKCE entries
 */
function cleanupExpiredPkce(): void {
  const now = Date.now();
  for (const [state, data] of pkceStore.entries()) {
    if (now > data.expiresAt) {
      pkceStore.delete(state);
    }
  }
}

/**
 * Start OAuth flow - returns authorization URL
 */
export function startOAuthFlow(modelId: string): { authUrl: string; state: string } {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store PKCE data (expires in 10 minutes)
  pkceStore.set(state, {
    codeVerifier,
    modelId,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  // Clean up expired entries
  cleanupExpiredPkce();

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: FANVUE_CONFIG.clientId,
    redirect_uri: FANVUE_CONFIG.redirectUri,
    response_type: 'code',
    scope: FANVUE_CONFIG.scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authUrl = `${FANVUE_CONFIG.authUrl}?${params.toString()}`;

  return { authUrl, state };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  state: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  modelId: string;
}> {
  // Retrieve and validate PKCE data
  const pkceData = pkceStore.get(state);
  if (!pkceData) {
    throw new Error('Invalid or expired state parameter');
  }

  if (Date.now() > pkceData.expiresAt) {
    pkceStore.delete(state);
    throw new Error('State parameter expired');
  }

  const { codeVerifier, modelId } = pkceData;
  pkceStore.delete(state); // One-time use

  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: FANVUE_CONFIG.clientId,
    client_secret: FANVUE_CONFIG.clientSecret,
    code,
    redirect_uri: FANVUE_CONFIG.redirectUri,
    code_verifier: codeVerifier
  });

  const response = await fetch(FANVUE_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenParams.toString()
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Fanvue token error:', errorData);
    throw new Error(`Failed to exchange code for tokens: ${response.status}`);
  }

  const tokenData = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
    scope: tokenData.scope,
    modelId
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const tokenParams = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: FANVUE_CONFIG.clientId,
    client_secret: FANVUE_CONFIG.clientSecret,
    refresh_token: refreshToken
  });

  const response = await fetch(FANVUE_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenParams.toString()
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Fanvue refresh error:', errorData);
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  const tokenData = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || refreshToken,
    expiresIn: tokenData.expires_in
  };
}

/**
 * Save Fanvue tokens for a model
 */
export async function saveFanvueTokens(
  modelId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  fanvueUserUuid?: string,
  fanvueUsername?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await query(
    `UPDATE models SET
       fanvue_access_token = $1,
       fanvue_refresh_token = $2,
       fanvue_token_expires_at = $3,
       fanvue_user_uuid = COALESCE($4, fanvue_user_uuid),
       fanvue_username = COALESCE($5, fanvue_username),
       platform = CASE
         WHEN platform = 'onlyfans' THEN 'both'::platform_type
         ELSE platform
       END,
       updated_at = NOW()
     WHERE id = $6`,
    [accessToken, refreshToken, expiresAt, fanvueUserUuid, fanvueUsername, modelId]
  );
}

/**
 * Get Fanvue tokens for a model (with auto-refresh if expired)
 */
export async function getFanvueTokens(modelId: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const result = await query(
    `SELECT fanvue_access_token, fanvue_refresh_token, fanvue_token_expires_at
     FROM models
     WHERE id = $1`,
    [modelId]
  );

  if (result.rows.length === 0 || !result.rows[0].fanvue_access_token) {
    return null;
  }

  const { fanvue_access_token, fanvue_refresh_token, fanvue_token_expires_at } = result.rows[0];

  // Check if token is expired (with 5 min buffer)
  const isExpired = new Date(fanvue_token_expires_at).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired && fanvue_refresh_token) {
    try {
      console.log(`Refreshing expired Fanvue token for model ${modelId}`);
      const newTokens = await refreshAccessToken(fanvue_refresh_token);
      await saveFanvueTokens(modelId, newTokens.accessToken, newTokens.refreshToken, newTokens.expiresIn);
      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken
      };
    } catch (error) {
      console.error('Failed to refresh Fanvue token:', error);
      return null;
    }
  }

  return {
    accessToken: fanvue_access_token,
    refreshToken: fanvue_refresh_token
  };
}

/**
 * Revoke/disconnect Fanvue for a model
 */
export async function revokeFanvueTokens(modelId: string): Promise<void> {
  await query(
    `UPDATE models SET
       fanvue_access_token = NULL,
       fanvue_refresh_token = NULL,
       fanvue_token_expires_at = NULL,
       fanvue_user_uuid = NULL,
       fanvue_username = NULL,
       platform = CASE
         WHEN platform = 'both' THEN 'onlyfans'::platform_type
         WHEN platform = 'fanvue' THEN NULL
         ELSE platform
       END,
       updated_at = NOW()
     WHERE id = $1`,
    [modelId]
  );
}

/**
 * Check if model has valid Fanvue connection
 */
export async function hasFanvueConnection(modelId: string): Promise<boolean> {
  const tokens = await getFanvueTokens(modelId);
  return tokens !== null;
}

/**
 * Get Fanvue API config for making requests
 */
export function getFanvueApiConfig() {
  return {
    baseUrl: FANVUE_CONFIG.apiBaseUrl,
    apiVersion: FANVUE_CONFIG.apiVersion
  };
}

/**
 * Get model's Fanvue info
 */
export async function getFanvueInfo(modelId: string): Promise<{
  connected: boolean;
  username: string | null;
  userUuid: string | null;
  tokenExpiresAt: Date | null;
} | null> {
  const result = await query(
    `SELECT
       fanvue_username,
       fanvue_user_uuid,
       fanvue_token_expires_at,
       fanvue_access_token IS NOT NULL as connected
     FROM models
     WHERE id = $1`,
    [modelId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    connected: row.connected,
    username: row.fanvue_username,
    userUuid: row.fanvue_user_uuid,
    tokenExpiresAt: row.fanvue_token_expires_at
  };
}
