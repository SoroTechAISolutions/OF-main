// ============================================
// Fanvue Webhooks Handler
// ============================================

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db/connection';
import { generateAIResponse, logAIResponse } from '../services/aiService';
import { sendMessage } from '../services/fanvueService';

const router = Router();

// Webhook secret for signature verification
const WEBHOOK_SECRET = process.env.FANVUE_WEBHOOK_SECRET || '';

/**
 * Verify Fanvue webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('FANVUE_WEBHOOK_SECRET not set, skipping verification');
    return true; // Allow in dev mode
  }

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Find model by Fanvue user UUID
 */
async function findModelByFanvueUuid(fanvueUserUuid: string): Promise<string | null> {
  const result = await query(
    'SELECT id FROM models WHERE fanvue_user_uuid = $1',
    [fanvueUserUuid]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Find or create chat for Fanvue conversation
 */
async function findOrCreateChat(
  modelId: string,
  fanUserUuid: string,
  fanUsername?: string,
  fanDisplayName?: string
): Promise<string> {
  // Try to find existing chat
  const existing = await query(
    `SELECT id FROM chats
     WHERE model_id = $1 AND fanvue_chat_uuid = $2`,
    [modelId, fanUserUuid]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new chat
  const result = await query(
    `INSERT INTO chats (
       model_id, platform, fanvue_chat_uuid,
       fan_username, fan_display_name
     ) VALUES ($1, 'fanvue', $2, $3, $4)
     RETURNING id`,
    [modelId, fanUserUuid, fanUsername || 'unknown', fanDisplayName]
  );

  return result.rows[0].id;
}

/**
 * Save incoming message
 */
async function saveMessage(
  chatId: string,
  messageUuid: string,
  content: string,
  isFromCreator: boolean,
  sentAt: string
): Promise<void> {
  // Check if message already exists
  const existing = await query(
    'SELECT id FROM messages WHERE fanvue_message_uuid = $1',
    [messageUuid]
  );

  if (existing.rows.length > 0) {
    return; // Already processed
  }

  // direction: 'outgoing' = from creator, 'incoming' = from fan
  const direction = isFromCreator ? 'outgoing' : 'incoming';

  await query(
    `INSERT INTO messages (
       chat_id, platform, fanvue_message_uuid,
       content, direction, created_at
     ) VALUES ($1, 'fanvue', $2, $3, $4, $5)`,
    [chatId, messageUuid, content, direction, sentAt]
  );
}

// ============================================
// Webhook Endpoint
// ============================================

/**
 * @swagger
 * /api/webhooks/fanvue:
 *   post:
 *     summary: Receive Fanvue webhook events
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Verify signature
    const signature = req.headers['x-fanvue-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (signature && !verifySignature(payload, signature)) {
      console.error('Invalid Fanvue webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data, creatorUuid } = req.body;

    console.log(`Fanvue webhook received: ${event}`, { creatorUuid });

    // Find model by creator UUID
    const modelId = await findModelByFanvueUuid(creatorUuid);
    if (!modelId) {
      console.warn(`No model found for Fanvue creator: ${creatorUuid}`);
      return res.status(200).json({ received: true, processed: false });
    }

    // Process based on event type
    switch (event) {
      case 'message.received': {
        // New message from a fan
        const { messageUuid, content, senderUuid, senderUsername, senderDisplayName, createdAt } = data;

        const chatId = await findOrCreateChat(
          modelId,
          senderUuid,
          senderUsername,
          senderDisplayName
        );

        await saveMessage(chatId, messageUuid, content, false, createdAt);

        // Update chat last message time
        await query(
          `UPDATE chats SET
             last_message_at = $1,
             updated_at = NOW()
           WHERE id = $2`,
          [createdAt, chatId]
        );

        console.log(`Saved new message from ${senderUsername} to model ${modelId}`);

        // Check if AI auto-response is enabled for this model
        const modelSettings = await query(
          'SELECT ai_enabled, persona_id FROM models WHERE id = $1',
          [modelId]
        );

        if (modelSettings.rows[0]?.ai_enabled) {
          try {
            console.log(`Generating AI response for ${senderUsername}...`);

            // Generate AI response
            const aiResult = await generateAIResponse({
              modelId,
              fanMessage: content,
              personaId: modelSettings.rows[0].persona_id
            });

            if (aiResult.response) {
              // Log the AI response
              await logAIResponse({
                modelId,
                fanMessage: content,
                generatedResponse: aiResult.response,
                generationTimeMs: aiResult.generationTimeMs
              });

              // Send the response via Fanvue API
              await sendMessage(modelId, senderUuid, aiResult.response);
              console.log(`AI response sent to ${senderUsername} in ${aiResult.generationTimeMs}ms`);
            }
          } catch (aiError) {
            console.error('AI auto-response failed:', aiError);
            // Don't throw - we still successfully received the webhook
          }
        }
        break;
      }

      case 'message.sent': {
        // Confirmation that our message was sent
        const { messageUuid, content, recipientUuid, createdAt } = data;

        const chatId = await findOrCreateChat(modelId, recipientUuid);
        await saveMessage(chatId, messageUuid, content, true, createdAt);

        console.log(`Confirmed sent message to ${recipientUuid}`);
        break;
      }

      case 'subscriber.new': {
        // New subscriber
        const { subscriberUuid, subscriberUsername, subscriberDisplayName, subscribedAt, price } = data;

        // Create or update chat
        await findOrCreateChat(modelId, subscriberUuid, subscriberUsername, subscriberDisplayName);

        // Log the subscription event (could trigger welcome message, etc.)
        console.log(`New Fanvue subscriber: ${subscriberUsername} at $${price}`);

        // TODO: Trigger AI welcome message if configured
        break;
      }

      case 'subscriber.expired': {
        // Subscription expired
        const { subscriberUuid, subscriberUsername, expiredAt } = data;

        console.log(`Fanvue subscription expired: ${subscriberUsername}`);
        // TODO: Trigger re-engagement campaign if configured
        break;
      }

      case 'tip.received': {
        // Fan sent a tip
        const { senderUuid, senderUsername, amount, message, createdAt } = data;

        console.log(`Tip received from ${senderUsername}: $${amount}`);

        // If tip has a message, save it
        if (message) {
          const chatId = await findOrCreateChat(modelId, senderUuid, senderUsername);
          const tipMessageUuid = `tip-${Date.now()}-${senderUuid}`;
          await saveMessage(chatId, tipMessageUuid, `[TIP $${amount}] ${message}`, false, createdAt);
        }

        // TODO: Trigger thank you message if configured
        break;
      }

      case 'purchase.completed': {
        // Fan purchased content
        const { buyerUuid, buyerUsername, contentType, price, createdAt } = data;

        console.log(`Purchase from ${buyerUsername}: ${contentType} at $${price}`);
        // TODO: Track purchases for analytics
        break;
      }

      default:
        console.log(`Unknown Fanvue webhook event: ${event}`);
    }

    res.json({ received: true, processed: true });
  } catch (error) {
    console.error('Fanvue webhook error:', error);
    // Still return 200 to prevent retries for our errors
    res.status(200).json({ received: true, error: 'Processing failed' });
  }
});

/**
 * @swagger
 * /api/webhooks/fanvue/test:
 *   post:
 *     summary: Test webhook endpoint
 *     tags: [Webhooks]
 */
router.post('/test', async (req: Request, res: Response) => {
  console.log('Fanvue test webhook received:', req.body);
  res.json({ success: true, message: 'Test webhook received' });
});

// ============================================
// Event-specific webhook routes
// (Fanvue sends to different URLs per event type)
// ============================================

/**
 * Message received webhook
 */
router.post('/message', async (req: Request, res: Response) => {
  // Add event type if not present
  req.body.event = req.body.event || 'message.received';

  // Forward to main handler by calling the route handler
  console.log('Fanvue message webhook received:', JSON.stringify(req.body));

  try {
    // Fanvue payload structure:
    // recipientUuid = creator, sender = fan, message = message data
    const { recipientUuid, sender, message } = req.body;

    const modelId = await findModelByFanvueUuid(recipientUuid);
    if (!modelId) {
      console.warn(`No model found for Fanvue creator: ${recipientUuid}`);
      return res.status(200).json({ received: true, processed: false });
    }

    // Extract message and sender data
    const content = message?.text;
    const messageUuid = message?.uuid || req.body.messageUuid;
    const sentAt = message?.createdAt;
    const senderUuid = sender?.uuid;
    const senderUsername = sender?.handle;
    const senderDisplayName = sender?.displayName;

    if (!content || !senderUuid) {
      console.log('Missing message content or sender');
      return res.status(200).json({ received: true, processed: false });
    }

    const chatId = await findOrCreateChat(modelId, senderUuid, senderUsername, senderDisplayName);
    await saveMessage(chatId, messageUuid || `msg-${Date.now()}`, content, false, sentAt || new Date().toISOString());

    // Update chat
    await query(
      `UPDATE chats SET last_message_at = $1, updated_at = NOW() WHERE id = $2`,
      [sentAt || new Date().toISOString(), chatId]
    );

    console.log(`Saved message from ${senderUsername} to model ${modelId}`);

    // Check if AI auto-response is enabled
    const modelSettings = await query('SELECT ai_enabled, persona_id FROM models WHERE id = $1', [modelId]);

    if (modelSettings.rows[0]?.ai_enabled) {
      try {
        console.log(`Generating AI response for ${senderUsername}...`);
        const aiResult = await generateAIResponse({
          modelId,
          fanMessage: content,
          personaId: modelSettings.rows[0].persona_id
        });

        if (aiResult.response) {
          await logAIResponse({
            modelId,
            fanMessage: content,
            generatedResponse: aiResult.response,
            generationTimeMs: aiResult.generationTimeMs
          });

          await sendMessage(modelId, senderUuid, aiResult.response);
          console.log(`AI response sent to ${senderUsername} in ${aiResult.generationTimeMs}ms`);
        }
      } catch (aiError) {
        console.error('AI auto-response failed:', aiError);
      }
    }

    res.json({ received: true, processed: true });
  } catch (error) {
    console.error('Fanvue message webhook error:', error);
    res.status(200).json({ received: true, error: 'Processing failed' });
  }
});

/**
 * Subscriber webhook
 */
router.post('/subscriber', async (req: Request, res: Response) => {
  console.log('Fanvue subscriber webhook received:', JSON.stringify(req.body).slice(0, 200));
  res.json({ received: true, processed: true });
});

/**
 * Tip webhook
 */
router.post('/tip', async (req: Request, res: Response) => {
  console.log('Fanvue tip webhook received:', JSON.stringify(req.body).slice(0, 200));
  res.json({ received: true, processed: true });
});

export default router;
