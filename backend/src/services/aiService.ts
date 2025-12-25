// ============================================
// AI Response Generation Service
// ============================================

import { query } from '../db/connection';
import { AIResponse } from '../types';
import { buildPromptForPersona, getDefaultPrompt } from './promptBuilderService';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.sorotech.ru/webhook/muse-chat';

/**
 * Generate AI response via n8n webhook
 */
export async function generateAIResponse(data: {
  modelId?: string;
  fanMessage: string;
  chatHistory?: { role: string; content: string }[];
  personaId?: string;
  modelName?: string;
  customRules?: string[];
}): Promise<{ response: string; generationTimeMs: number; personaUsed: string }> {
  const startTime = Date.now();

  // Build dynamic system prompt based on persona
  let systemMessage: string;
  let personaUsed: string;

  if (data.personaId) {
    const builtPrompt = buildPromptForPersona(
      data.personaId,
      data.modelName,
      { customRules: data.customRules }
    );

    if (builtPrompt) {
      systemMessage = builtPrompt;
      personaUsed = data.personaId;
      console.log(`Using persona: ${data.personaId}`);
    } else {
      console.warn(`Persona ${data.personaId} not found, using default`);
      systemMessage = getDefaultPrompt();
      personaUsed = 'default';
    }
  } else {
    systemMessage = getDefaultPrompt();
    personaUsed = 'default';
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatInput: data.fanMessage,
        systemMessage: systemMessage
      })
    });

    if (!response.ok) {
      throw new Error(`n8n webhook error: ${response.status}`);
    }

    const result = await response.json() as { output?: string; response?: string; text?: string };
    const generationTimeMs = Date.now() - startTime;

    console.log('n8n response:', JSON.stringify(result));

    const aiResponse = result.output || result.response || result.text || '';
    console.log('AI response extracted:', aiResponse.slice(0, 100));

    return {
      response: aiResponse,
      generationTimeMs,
      personaUsed
    };
  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}

/**
 * Log AI response to database
 */
export async function logAIResponse(data: {
  messageId?: string;
  modelId: string;
  fanMessage: string;
  generatedResponse: string;
  generationTimeMs: number;
  tokensUsed?: number;
}): Promise<AIResponse> {
  const result = await query(
    `INSERT INTO ai_responses (
      message_id, model_id, input_text, output_text,
      latency_ms, tokens_output
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      data.messageId || null,
      data.modelId,
      data.fanMessage,
      data.generatedResponse,
      data.generationTimeMs,
      data.tokensUsed || null
    ]
  );

  return result.rows[0];
}

/**
 * Update AI response when sent
 */
export async function markAIResponseSent(
  aiResponseId: string,
  wasEdited: boolean,
  feedback?: string
): Promise<void> {
  await query(
    `UPDATE ai_responses
     SET was_used = true, was_edited = $2, feedback = $3
     WHERE id = $1`,
    [aiResponseId, wasEdited, feedback || null]
  );
}

/**
 * Get AI responses for analytics
 */
export async function getAIResponsesByModel(
  modelId: string,
  limit = 100
): Promise<AIResponse[]> {
  const result = await query(
    `SELECT * FROM ai_responses
     WHERE model_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [modelId, limit]
  );

  return result.rows;
}

/**
 * Get AI analytics stats
 */
export async function getAIAnalytics(modelId: string): Promise<{
  totalGenerated: number;
  totalUsed: number;
  totalEdited: number;
  avgLatencyMs: number;
  editRate: number;
}> {
  const result = await query(
    `SELECT
      COUNT(*) as total_generated,
      COUNT(*) FILTER (WHERE was_used = true) as total_used,
      COUNT(*) FILTER (WHERE was_edited = true) as total_edited,
      AVG(latency_ms) as avg_latency
     FROM ai_responses
     WHERE model_id = $1`,
    [modelId]
  );

  const stats = result.rows[0];
  const totalUsed = parseInt(stats.total_used) || 0;
  const totalEdited = parseInt(stats.total_edited) || 0;

  return {
    totalGenerated: parseInt(stats.total_generated) || 0,
    totalUsed,
    totalEdited,
    avgLatencyMs: Math.round(parseFloat(stats.avg_latency) || 0),
    editRate: totalUsed > 0 ? Math.round((totalEdited / totalUsed) * 100) : 0
  };
}
