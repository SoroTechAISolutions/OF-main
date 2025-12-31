// ============================================
// Auto-Reply Worker - Automated Fanvue Responses
// ============================================

import { query } from '../db/connection';
import { getChats, getChatMessages, sendMessage } from '../services/fanvueService';
import { generateAIResponse } from '../services/aiService';

interface ModelWithAutoReply {
  id: string;
  of_username: string;
  fanvue_username: string;
  fanvue_user_uuid: string;
  persona_id: string;
  auto_reply_delay_seconds: number;
}

// Track processed messages to avoid duplicates
const processedMessages = new Set<string>();
const MAX_PROCESSED_CACHE = 10000;

// Track last reply time per chat to respect delay
const lastReplyTime = new Map<string, number>();

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Get all models with auto-reply enabled
 */
async function getAutoReplyModels(): Promise<ModelWithAutoReply[]> {
  const result = await query(`
    SELECT id, of_username, fanvue_username, fanvue_user_uuid, persona_id, auto_reply_delay_seconds
    FROM models
    WHERE auto_reply_enabled = true
      AND fanvue_access_token IS NOT NULL
      AND fanvue_user_uuid IS NOT NULL
  `);
  return result.rows;
}

/**
 * Process unread chats for a model
 */
async function processModelChats(model: ModelWithAutoReply): Promise<number> {
  let repliesSent = 0;

  try {
    // Get unread chats
    const { chats } = await getChats(model.id, { filter: 'unread', limit: 20 });

    if (chats.length > 0) {
      console.log(`[AutoReply] Model ${model.fanvue_username}: ${chats.length} unread chats`);
    }

    for (const chat of chats) {
      const chatAny = chat as any;
      // Fanvue uses user.uuid as chat identifier
      const fanUser = chatAny.user || chatAny.fan || chatAny.recipient || {};
      const fanUserUuid = fanUser.uuid || fanUser.id || fanUser.userId || chatAny.recipientUuid || chatAny.fanUuid;
      // Use fanUserUuid as chatUuid since Fanvue doesn't have separate chat IDs
      const chatUuid = chatAny.uuid || chatAny.id || chatAny.chatId || fanUserUuid;
      const fanName = fanUser.displayName || fanUser.handle || 'Unknown';

      if (!fanUserUuid) {
        console.log(`[AutoReply] Skipping chat - no fanUserUuid`);
        continue;
      }

      // Skip broadcast messages - only reply to personal messages
      const lastMessagePreview = chatAny.lastMessage || {};
      if (lastMessagePreview.type === 'BROADCAST') {
        console.log(`[AutoReply] Skipping ${fanName} - broadcast message`);
        continue;
      }

      try {
        // Check if we've replied to this chat recently
        const chatKey = `${model.id}:${chatUuid}`;
        const lastReply = lastReplyTime.get(chatKey) || 0;
        const now = Date.now();
        const delayMs = (model.auto_reply_delay_seconds || 30) * 1000;

        if (now - lastReply < delayMs) {
          console.log(`[AutoReply] Skipping chat ${chatUuid} - too soon (${Math.round((now - lastReply) / 1000)}s ago)`);
          continue;
        }

        // Get last message to see if it's from fan (not creator)
        const { messages } = await getChatMessages(model.id, fanUserUuid, { limit: 5 });

        if (messages.length === 0) {
          console.log(`[AutoReply] Skipping ${fanName} - no messages`);
          continue;
        }

        // Check if the LAST message is from the fan (not from model)
        // If model already replied - skip
        const modelUuid = model.fanvue_user_uuid;
        const lastMessage = messages[0] as any; // First in list = most recent

        // Skip if last message is automated
        if (lastMessage.type && lastMessage.type.startsWith('AUTOMATED')) {
          console.log(`[AutoReply] Skipping ${fanName} - automated message (${lastMessage.type})`);
          continue;
        }

        // Skip if last message is from model (already replied)
        const lastSenderUuid = lastMessage.sender?.uuid || lastMessage.senderUuid;
        if (lastSenderUuid === modelUuid) {
          console.log(`[AutoReply] Skipping ${fanName} - model already replied`);
          continue;
        }

        // Last message is from fan - we need to reply
        const lastFanMessage = lastMessage;

        // Check if we already processed this message
        const messageKey = `${model.id}:${lastFanMessage.uuid}`;
        if (processedMessages.has(messageKey)) {
          console.log(`[AutoReply] Skipping ${fanName} - already processed`);
          continue;
        }

        // Get message content (Fanvue uses 'text' field)
        const fanMessage = (lastFanMessage as any).text || (lastFanMessage as any).content || '';
        if (!fanMessage.trim()) {
          console.log(`[AutoReply] Skipping ${fanName} - empty message`);
          continue;
        }

        const fanUsername = fanUser.handle || fanUser.username || fanUser.displayName || fanUser.name || 'Unknown';
        console.log(`[AutoReply] Processing message from ${fanUsername}: "${fanMessage.slice(0, 50)}..."`);

        // Generate AI response
        const aiResult = await generateAIResponse({
          modelId: model.id,
          fanMessage,
          personaId: model.persona_id || 'gfe_sweet',
          modelName: model.fanvue_username
        });

        if (!aiResult.response) {
          console.error(`[AutoReply] Empty AI response for chat ${chatUuid}`);
          continue;
        }

        console.log(`[AutoReply] Generated response: "${aiResult.response.slice(0, 50)}..."`);

        // Send the response via Fanvue API
        await sendMessage(model.id, fanUserUuid, aiResult.response);

        console.log(`[AutoReply] ✓ Sent response to ${fanUsername}`);

        // Log to extension_logs for dashboard stats
        await query(`
          INSERT INTO extension_logs (
            model_username, fan_name, persona_id,
            fan_message, generated_response,
            generation_time_ms, was_used
          ) VALUES ($1, $2, $3, $4, $5, $6, true)
        `, [
          model.fanvue_username || model.of_username,
          fanUsername,
          model.persona_id || 'gfe_sweet',
          fanMessage,
          aiResult.response,
          aiResult.generationTimeMs
        ]);

        // Mark message as processed
        processedMessages.add(messageKey);
        lastReplyTime.set(chatKey, Date.now());
        repliesSent++;

        // Clear old entries from cache
        if (processedMessages.size > MAX_PROCESSED_CACHE) {
          const toDelete = Array.from(processedMessages).slice(0, 1000);
          toDelete.forEach(k => processedMessages.delete(k));
        }

      } catch (chatError) {
        console.error(`[AutoReply] Error processing chat ${chatUuid}:`, chatError);
      }
    }
  } catch (error) {
    console.error(`[AutoReply] Error processing model ${model.fanvue_username}:`, error);
  }

  return repliesSent;
}

/**
 * Main worker tick - runs every interval
 */
async function workerTick(): Promise<void> {
  if (isRunning) {
    console.log('[AutoReply] Previous tick still running, skipping...');
    return;
  }

  isRunning = true;

  try {
    const models = await getAutoReplyModels();

    if (models.length === 0) {
      return; // No models with auto-reply enabled
    }

    console.log(`[AutoReply] Processing ${models.length} models with auto-reply enabled`);

    let totalReplies = 0;
    for (const model of models) {
      const replies = await processModelChats(model);
      totalReplies += replies;
    }

    if (totalReplies > 0) {
      console.log(`[AutoReply] ✓ Sent ${totalReplies} auto-replies this tick`);
    }
  } catch (error) {
    console.error('[AutoReply] Worker error:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the auto-reply worker
 */
export function startAutoReplyWorker(intervalSeconds = 30): void {
  if (intervalId) {
    console.log('[AutoReply] Worker already running');
    return;
  }

  console.log(`[AutoReply] Starting worker with ${intervalSeconds}s interval`);

  // Run immediately on start
  workerTick();

  // Then run on interval
  intervalId = setInterval(workerTick, intervalSeconds * 1000);
}

/**
 * Stop the auto-reply worker
 */
export function stopAutoReplyWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[AutoReply] Worker stopped');
  }
}

/**
 * Check if worker is running
 */
export function isAutoReplyWorkerRunning(): boolean {
  return intervalId !== null;
}
