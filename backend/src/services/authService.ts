// ============================================
// Authentication Service
// ============================================

import bcrypt from 'bcryptjs';
import { query } from '../db/connection';
import { User, RegisterRequest, JWTPayload } from '../types';
import { generateTokens } from '../middleware/auth';

const SALT_ROUNDS = 10;

/**
 * Register new user and agency
 */
export async function registerUser(data: RegisterRequest): Promise<{ user: Omit<User, 'password_hash'>; accessToken: string; refreshToken: string }> {
  // Hash password
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Start transaction
  const client = await (await import('../db/connection')).pool.connect();

  try {
    await client.query('BEGIN');

    // Create agency
    const agencyResult = await client.query(
      `INSERT INTO agencies (name, email)
       VALUES ($1, $2)
       RETURNING id, name, email, plan, created_at`,
      [data.agency_name, data.email]
    );
    const agency = agencyResult.rows[0];

    // Create user as owner
    const userResult = await client.query(
      `INSERT INTO users (agency_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'owner')
       RETURNING id, agency_id, email, name, role, is_active, created_at`,
      [agency.id, data.email, passwordHash, data.name]
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');

    // Generate tokens
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      agencyId: user.agency_id,
      role: user.role
    };
    const { accessToken, refreshToken } = generateTokens(payload);

    return { user, accessToken, refreshToken };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; accessToken: string; refreshToken: string } | null> {
  // Find user by email
  const result = await query(
    `SELECT id, agency_id, email, password_hash, name, role, is_active
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Check if user is active
  if (!user.is_active) {
    throw new Error('Account is deactivated');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  // Generate tokens
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    agencyId: user.agency_id,
    role: user.role
  };
  const { accessToken, refreshToken } = generateTokens(payload);

  // Remove password_hash from response
  const { password_hash, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
  const result = await query(
    `SELECT id, agency_id, email, name, role, is_active, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  return result.rows.length > 0;
}
