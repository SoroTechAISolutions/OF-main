// ============================================
// Chat & Message Service
// ============================================

import { query } from '../db/connection';
import { Chat, Message, PaginationParams, PaginatedResponse } from '../types';

// ==================== CHATS ====================

/**
 * Get chats for a model
 */
export async function getChatsByModel(
  modelId: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Chat>> {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 50;
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) FROM chats WHERE model_id = $1',
    [modelId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT * FROM chats
     WHERE model_id = $1
     ORDER BY last_message_at DESC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [modelId, limit, offset]
  );

  return {
    items: result.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Get chat by ID
 */
export async function getChatById(chatId: string): Promise<Chat | null> {
  const result = await query(
    'SELECT * FROM chats WHERE id = $1',
    [chatId]
  );
  return result.rows[0] || null;
}

/**
 * Get or create chat by fan
 */
export async function getOrCreateChat(
  modelId: string,
  fanOfId: string,
  fanUsername: string,
  fanAvatarUrl?: string
): Promise<Chat> {
  // Try to find existing chat
  const existing = await query(
    'SELECT * FROM chats WHERE model_id = $1 AND fan_of_id = $2',
    [modelId, fanOfId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Create new chat
  const result = await query(
    `INSERT INTO chats (model_id, fan_of_id, fan_username, fan_avatar_url, first_message_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [modelId, fanOfId, fanUsername, fanAvatarUrl]
  );

  return result.rows[0];
}

/**
 * Update chat
 */
export async function updateChat(chatId: string, data: Partial<Chat>): Promise<Chat | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = [
    'fan_username', 'fan_display_name', 'fan_avatar_url', 'subscription_active',
    'status', 'tags', 'notes', 'last_message_at', 'last_message_preview',
    'total_messages', 'total_spent'
  ];

  for (const field of allowedFields) {
    if (data[field as keyof Chat] !== undefined) {
      updates.push(`${field} = $${paramCount}`);
      let value = data[field as keyof Chat];
      if (field === 'tags') {
        value = JSON.stringify(value);
      }
      values.push(value);
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return getChatById(chatId);
  }

  updates.push('updated_at = NOW()');
  values.push(chatId);

  const result = await query(
    `UPDATE chats SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

// ==================== MESSAGES ====================

/**
 * Get messages for a chat
 */
export async function getMessagesByChat(
  chatId: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Message>> {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 100;
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) FROM messages WHERE chat_id = $1',
    [chatId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT * FROM messages
     WHERE chat_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [chatId, limit, offset]
  );

  return {
    items: result.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Create message
 */
export async function createMessage(data: {
  chatId: string;
  ofMessageId?: string;
  direction: 'incoming' | 'outgoing';
  content?: string;
  hasMedia?: boolean;
  mediaType?: string;
  mediaCount?: number;
  isPpv?: boolean;
  ppvPrice?: number;
  sentByUserId?: string;
  sentByAi?: boolean;
}): Promise<Message> {
  const result = await query(
    `INSERT INTO messages (
      chat_id, of_message_id, direction, content,
      has_media, media_type, media_count,
      is_ppv, ppv_price, sent_by_user_id, sent_by_ai
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      data.chatId,
      data.ofMessageId || null,
      data.direction,
      data.content || null,
      data.hasMedia || false,
      data.mediaType || null,
      data.mediaCount || 0,
      data.isPpv || false,
      data.ppvPrice || null,
      data.sentByUserId || null,
      data.sentByAi || false
    ]
  );

  // Update chat last_message_at
  await query(
    'UPDATE chats SET last_message_at = NOW() WHERE id = $1',
    [data.chatId]
  );

  return result.rows[0];
}

/**
 * Get message by OF message ID
 */
export async function getMessageByOfId(chatId: string, ofMessageId: string): Promise<Message | null> {
  const result = await query(
    'SELECT * FROM messages WHERE chat_id = $1 AND of_message_id = $2',
    [chatId, ofMessageId]
  );
  return result.rows[0] || null;
}

/**
 * Mark message as read
 */
export async function markMessageRead(messageId: string): Promise<void> {
  await query(
    'UPDATE messages SET read_at = NOW() WHERE id = $1 AND read_at IS NULL',
    [messageId]
  );
}

/**
 * Update PPV unlock status
 */
export async function markPpvUnlocked(messageId: string): Promise<void> {
  await query(
    'UPDATE messages SET ppv_unlocked = true, unlocked = true WHERE id = $1',
    [messageId]
  );
}
