// ============================================
// Model Service (OF Accounts)
// ============================================

import { query } from '../db/connection';
import { Model, PaginationParams, PaginatedResponse } from '../types';

/**
 * Get all models for agency
 */
export async function getModelsByAgency(
  agencyId: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Model>> {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;
  const sortBy = pagination?.sortBy || 'created_at';
  const sortOrder = pagination?.sortOrder || 'desc';

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) FROM models WHERE agency_id = $1',
    [agencyId]
  );
  const total = parseInt(countResult.rows[0].count);

  // Get models
  const result = await query(
    `SELECT * FROM models
     WHERE agency_id = $1
     ORDER BY ${sortBy} ${sortOrder}
     LIMIT $2 OFFSET $3`,
    [agencyId, limit, offset]
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
 * Get model by ID
 */
export async function getModelById(modelId: string, agencyId: string): Promise<Model | null> {
  const result = await query(
    'SELECT * FROM models WHERE id = $1 AND agency_id = $2',
    [modelId, agencyId]
  );
  return result.rows[0] || null;
}

/**
 * Get model by OF username
 */
export async function getModelByUsername(ofUsername: string, agencyId: string): Promise<Model | null> {
  const result = await query(
    'SELECT * FROM models WHERE of_username = $1 AND agency_id = $2',
    [ofUsername, agencyId]
  );
  return result.rows[0] || null;
}

/**
 * Create new model
 */
export async function createModel(agencyId: string, data: Partial<Model>): Promise<Model> {
  const result = await query(
    `INSERT INTO models (
      agency_id, of_username, of_user_id, display_name, avatar_url,
      header_url, subscription_price, is_verified, persona_prompt,
      ai_enabled, settings
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      agencyId,
      data.of_username,
      data.of_user_id || null,
      data.display_name || data.of_username,
      data.avatar_url || null,
      data.header_url || null,
      data.subscription_price || null,
      data.is_verified || false,
      data.persona_prompt || null,
      data.ai_enabled !== false, // default true
      JSON.stringify(data.settings || {})
    ]
  );
  return result.rows[0];
}

/**
 * Update model
 */
export async function updateModel(
  modelId: string,
  agencyId: string,
  data: Partial<Model>
): Promise<Model | null> {
  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = [
    'of_username', 'of_user_id', 'display_name', 'avatar_url',
    'header_url', 'subscription_price', 'is_verified', 'persona_prompt',
    'ai_enabled', 'settings', 'last_seen_at'
  ];

  for (const field of allowedFields) {
    if (data[field as keyof Model] !== undefined) {
      updates.push(`${field} = $${paramCount}`);
      let value = data[field as keyof Model];
      if (field === 'settings') {
        value = JSON.stringify(value);
      }
      values.push(value);
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return getModelById(modelId, agencyId);
  }

  updates.push('updated_at = NOW()');
  values.push(modelId, agencyId);

  const result = await query(
    `UPDATE models SET ${updates.join(', ')}
     WHERE id = $${paramCount} AND agency_id = $${paramCount + 1}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete model
 */
export async function deleteModel(modelId: string, agencyId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM models WHERE id = $1 AND agency_id = $2',
    [modelId, agencyId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get model stats
 */
export async function getModelStats(modelId: string): Promise<{
  totalChats: number;
  activeChats: number;
  totalMessages: number;
  aiResponsesUsed: number;
}> {
  const chatsResult = await query(
    `SELECT
      COUNT(*) as total_chats,
      COUNT(*) FILTER (WHERE status = 'active') as active_chats
     FROM chats WHERE model_id = $1`,
    [modelId]
  );

  const messagesResult = await query(
    `SELECT COUNT(*) as total_messages
     FROM messages m
     JOIN chats c ON m.chat_id = c.id
     WHERE c.model_id = $1`,
    [modelId]
  );

  const aiResult = await query(
    `SELECT COUNT(*) as ai_responses
     FROM ai_responses WHERE model_id = $1 AND was_sent = true`,
    [modelId]
  );

  return {
    totalChats: parseInt(chatsResult.rows[0].total_chats),
    activeChats: parseInt(chatsResult.rows[0].active_chats),
    totalMessages: parseInt(messagesResult.rows[0].total_messages),
    aiResponsesUsed: parseInt(aiResult.rows[0].ai_responses)
  };
}
