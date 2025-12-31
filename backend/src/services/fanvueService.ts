// ============================================
// Fanvue API Service
// ============================================

import { getFanvueTokens, getFanvueApiConfig } from './fanvueOAuthService';
import { query } from '../db/connection';

interface FanvueApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  params?: Record<string, string>;
}

interface FanvueChat {
  uuid: string;
  user: {
    uuid: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
    isFromCreator: boolean;
  };
  unreadCount: number;
  isOnline: boolean;
  createdAt: string;
}

interface FanvueMessage {
  uuid: string;
  content: string;
  isFromCreator: boolean;
  createdAt: string;
  attachments?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
  }>;
}

interface FanvueSubscriber {
  uuid: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  subscribedAt: string;
  subscriptionPrice: number;
  totalSpent: number;
  isActive: boolean;
}

/**
 * Make authenticated request to Fanvue API
 */
async function fanvueRequest<T>(
  modelId: string,
  endpoint: string,
  options: FanvueApiOptions = {}
): Promise<T> {
  const tokens = await getFanvueTokens(modelId);
  if (!tokens) {
    throw new Error('Model not connected to Fanvue');
  }

  const config = getFanvueApiConfig();
  const { method = 'GET', body, params } = options;

  let url = `${config.baseUrl}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'X-Fanvue-API-Version': config.apiVersion,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Fanvue API error [${response.status}]:`, errorText);
    // Try to parse JSON error message
    let errorMessage = `Fanvue API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // Use raw text if not JSON
      if (errorText) {
        errorMessage = errorText;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ============================================
// Chat Functions
// ============================================

/**
 * Get list of chats for a model
 */
export async function getChats(
  modelId: string,
  options: {
    limit?: number;
    cursor?: string;
    filter?: 'all' | 'unread' | 'priority';
  } = {}
): Promise<{ chats: FanvueChat[]; nextCursor?: string }> {
  const params: Record<string, string> = {
    limit: String(options.limit || 20)
  };

  if (options.cursor) params.cursor = options.cursor;
  if (options.filter) params.filter = options.filter;

  const response = await fanvueRequest<{
    data: FanvueChat[];
    pagination: { nextCursor?: string };
  }>(modelId, '/chats', { params });

  return {
    chats: response.data,
    nextCursor: response.pagination?.nextCursor
  };
}

/**
 * Get messages for a specific chat
 */
export async function getChatMessages(
  modelId: string,
  fanUserUuid: string,
  options: {
    limit?: number;
    cursor?: string;
    before?: string;
  } = {}
): Promise<{ messages: FanvueMessage[]; nextCursor?: string }> {
  const params: Record<string, string> = {
    limit: String(options.limit || 50)
  };

  if (options.cursor) params.cursor = options.cursor;
  if (options.before) params.before = options.before;

  const response = await fanvueRequest<{
    data: FanvueMessage[];
    pagination: { nextCursor?: string };
  }>(modelId, `/chats/${fanUserUuid}/messages`, { params });

  return {
    messages: response.data,
    nextCursor: response.pagination?.nextCursor
  };
}

/**
 * Send a message to a fan
 */
export async function sendMessage(
  modelId: string,
  fanUserUuid: string,
  content: string,
  options: {
    price?: number;
    mediaIds?: string[];
  } = {}
): Promise<FanvueMessage> {
  // Fanvue uses 'text' field, not 'content'
  const body: any = { text: content };

  if (options.price) body.price = options.price;
  if (options.mediaIds?.length) body.mediaIds = options.mediaIds;

  console.log('Sending Fanvue message:', { fanUserUuid, text: content.slice(0, 50) });

  const response = await fanvueRequest<{ data: FanvueMessage }>(
    modelId,
    `/chats/${fanUserUuid}/message`,
    { method: 'POST', body }
  );

  return response.data;
}

/**
 * Send mass message to multiple fans
 */
export async function sendMassMessage(
  modelId: string,
  content: string,
  options: {
    price?: number;
    mediaIds?: string[];
    targetUserUuids?: string[];
    filters?: {
      hasSubscription?: boolean;
      hasPurchased?: boolean;
      subscribedAfter?: string;
    };
  } = {}
): Promise<{ messagesSent: number; messageUuid: string }> {
  const body: any = { content };

  if (options.price) body.price = options.price;
  if (options.mediaIds?.length) body.mediaIds = options.mediaIds;
  if (options.targetUserUuids?.length) body.targetUserUuids = options.targetUserUuids;
  if (options.filters) body.filters = options.filters;

  const response = await fanvueRequest<{
    data: { messagesSent: number; messageUuid: string };
  }>(modelId, '/chats/mass-messages', { method: 'POST', body });

  return response.data;
}

// ============================================
// Subscriber Functions
// ============================================

/**
 * Get list of subscribers
 */
export async function getSubscribers(
  modelId: string,
  options: {
    limit?: number;
    cursor?: string;
    status?: 'active' | 'expired' | 'all';
    sortBy?: 'recent' | 'totalSpent' | 'alphabetical';
  } = {}
): Promise<{ subscribers: FanvueSubscriber[]; nextCursor?: string }> {
  const params: Record<string, string> = {
    limit: String(options.limit || 20)
  };

  if (options.cursor) params.cursor = options.cursor;
  if (options.status) params.status = options.status;
  if (options.sortBy) params.sortBy = options.sortBy;

  const response = await fanvueRequest<{
    data: FanvueSubscriber[];
    pagination: { nextCursor?: string };
  }>(modelId, '/subscribers', { params });

  return {
    subscribers: response.data,
    nextCursor: response.pagination?.nextCursor
  };
}

/**
 * Get subscriber details
 */
export async function getSubscriber(
  modelId: string,
  fanUserUuid: string
): Promise<FanvueSubscriber> {
  const response = await fanvueRequest<{ data: FanvueSubscriber }>(
    modelId,
    `/subscribers/${fanUserUuid}`
  );

  return response.data;
}

// ============================================
// Creator Profile Functions
// ============================================

/**
 * Get current creator's profile (self)
 */
export async function getCreatorProfile(modelId: string): Promise<{
  uuid: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  subscriberCount: number;
  subscriptionPrice: number;
}> {
  const response = await fanvueRequest<{ data: any }>(modelId, '/self');
  return response.data;
}

// ============================================
// Sync Functions (save to our DB)
// ============================================

/**
 * Sync a Fanvue chat to our database
 */
export async function syncChatToDb(
  modelId: string,
  fanvueChat: FanvueChat
): Promise<string> {
  // Check if chat exists
  const existing = await query(
    `SELECT id FROM chats WHERE model_id = $1 AND fanvue_chat_uuid = $2`,
    [modelId, fanvueChat.uuid]
  );

  if (existing.rows.length > 0) {
    // Update existing
    await query(
      `UPDATE chats SET
         fan_username = $1,
         fan_display_name = $2,
         fan_avatar_url = $3,
         last_message_at = $4,
         unread_count = $5,
         is_online = $6,
         updated_at = NOW()
       WHERE id = $7`,
      [
        fanvueChat.user.username,
        fanvueChat.user.displayName,
        fanvueChat.user.avatarUrl,
        fanvueChat.lastMessage?.createdAt,
        fanvueChat.unreadCount,
        fanvueChat.isOnline,
        existing.rows[0].id
      ]
    );
    return existing.rows[0].id;
  } else {
    // Create new
    const result = await query(
      `INSERT INTO chats (
         model_id, platform, fanvue_chat_uuid,
         fan_username, fan_display_name, fan_avatar_url,
         last_message_at, unread_count, is_online
       ) VALUES ($1, 'fanvue', $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        modelId,
        fanvueChat.uuid,
        fanvueChat.user.username,
        fanvueChat.user.displayName,
        fanvueChat.user.avatarUrl,
        fanvueChat.lastMessage?.createdAt,
        fanvueChat.unreadCount,
        fanvueChat.isOnline
      ]
    );
    return result.rows[0].id;
  }
}

/**
 * Sync a Fanvue message to our database
 */
export async function syncMessageToDb(
  chatId: string,
  fanvueMessage: FanvueMessage
): Promise<string> {
  // Check if message exists
  const existing = await query(
    `SELECT id FROM messages WHERE chat_id = $1 AND fanvue_message_uuid = $2`,
    [chatId, fanvueMessage.uuid]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new message
  const result = await query(
    `INSERT INTO messages (
       chat_id, platform, fanvue_message_uuid,
       content, is_from_creator, sent_at
     ) VALUES ($1, 'fanvue', $2, $3, $4, $5)
     RETURNING id`,
    [
      chatId,
      fanvueMessage.uuid,
      fanvueMessage.content,
      fanvueMessage.isFromCreator,
      fanvueMessage.createdAt
    ]
  );

  return result.rows[0].id;
}

/**
 * Fetch and sync all chats from Fanvue
 */
export async function syncAllChats(modelId: string): Promise<number> {
  let synced = 0;
  let cursor: string | undefined;

  do {
    const { chats, nextCursor } = await getChats(modelId, { limit: 50, cursor });

    for (const chat of chats) {
      await syncChatToDb(modelId, chat);
      synced++;
    }

    cursor = nextCursor;
  } while (cursor);

  console.log(`Synced ${synced} Fanvue chats for model ${modelId}`);
  return synced;
}
