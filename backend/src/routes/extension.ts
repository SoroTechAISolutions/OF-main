// ============================================
// Extension API Routes
// Simplified auth for Chrome Extension
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { generateAIResponse, logAIResponse } from '../services/aiService';
import { getAvailablePersonas, getPersonaDetails } from '../services/promptBuilderService';
import { ApiResponse } from '../types';

const router = Router();

// Extension API key (for alpha/playground)
// In production, this would be per-agency keys
const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY || 'muse-alpha-2025';

/**
 * Middleware: Validate extension API key
 */
function validateExtensionKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-extension-key'] as string;

  if (!apiKey || apiKey !== EXTENSION_API_KEY) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or missing API key'
    };
    return res.status(401).json(response);
  }

  next();
}

// Apply API key validation to all routes
router.use(validateExtensionKey);

/**
 * @swagger
 * /api/extension/generate:
 *   post:
 *     summary: Generate AI response for Chrome Extension
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fanMessage]
 *             properties:
 *               fanMessage:
 *                 type: string
 *                 description: The fan's message to respond to
 *               fanName:
 *                 type: string
 *                 description: Fan's username (optional)
 *               modelUsername:
 *                 type: string
 *                 description: Model username for future multi-model support
 *               chatHistory:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Previous messages for context
 *     responses:
 *       200:
 *         description: AI response generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     response:
 *                       type: string
 *                       description: Generated AI response
 *                     generationTimeMs:
 *                       type: integer
 *                       description: Time to generate in milliseconds
 *       400:
 *         description: Missing fanMessage
 *       401:
 *         description: Invalid API key
 */
router.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { fanMessage, fanName, modelUsername, chatHistory, personaId, modelName } = req.body;

    if (!fanMessage) {
      const response: ApiResponse = {
        success: false,
        error: 'fanMessage is required'
      };
      return res.status(400).json(response);
    }

    console.log(`[Extension] Generate request: "${fanMessage.substring(0, 50)}..." persona: ${personaId || 'default'}`);

    // Generate AI response via n8n with dynamic persona
    const aiResult = await generateAIResponse({
      fanMessage,
      chatHistory,
      personaId: personaId || undefined,
      modelName: modelName || modelUsername || undefined
    });

    const generationTime = Date.now() - startTime;

    // Log to database (async, don't wait)
    logExtensionResponse({
      fanMessage,
      fanName: fanName || 'Unknown',
      modelUsername: modelUsername || 'default',
      personaId: aiResult.personaUsed,
      generatedResponse: aiResult.response,
      generationTimeMs: generationTime
    }).catch(err => {
      console.error('[Extension] Failed to log response:', err.message);
    });

    const response: ApiResponse = {
      success: true,
      data: {
        response: aiResult.response,
        generationTimeMs: generationTime,
        personaUsed: aiResult.personaUsed
      }
    };

    console.log(`[Extension] Generated in ${generationTime}ms using persona: ${aiResult.personaUsed}`);
    res.json(response);

  } catch (error) {
    console.error('[Extension] Generate error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate AI response'
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/extension/feedback:
 *   post:
 *     summary: Submit feedback about AI response
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [responseId]
 *             properties:
 *               responseId:
 *                 type: string
 *                 format: uuid
 *               wasUsed:
 *                 type: boolean
 *               wasEdited:
 *                 type: boolean
 *               editedText:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Feedback recorded
 *       400:
 *         description: Missing responseId
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { responseId, wasUsed, wasEdited, editedText, rating } = req.body;

    if (!responseId) {
      const response: ApiResponse = {
        success: false,
        error: 'responseId is required'
      };
      return res.status(400).json(response);
    }

    // Update the extension_logs table
    await pool.query(
      `UPDATE extension_logs
       SET was_used = $1, was_edited = $2, edited_text = $3, rating = $4, updated_at = NOW()
       WHERE id = $5`,
      [wasUsed ?? false, wasEdited ?? false, editedText, rating, responseId]
    );

    const response: ApiResponse = {
      success: true,
      message: 'Feedback recorded'
    };
    res.json(response);

  } catch (error) {
    console.error('[Extension] Feedback error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to record feedback'
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/extension/status:
 *   get:
 *     summary: Check Extension API status
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 *     responses:
 *       200:
 *         description: API is online
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: online
 *                     version:
 *                       type: string
 *                       example: 1.0.0-alpha
 *       503:
 *         description: Service unavailable
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'online',
        version: '1.0.0-alpha',
        features: {
          aiGeneration: true,
          logging: true,
          feedback: true
        }
      }
    };
    res.json(response);

  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Service unavailable'
    };
    res.status(503).json(response);
  }
});

/**
 * @swagger
 * /api/extension/stats:
 *   get:
 *     summary: Get usage statistics (last 24 hours)
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 *     responses:
 *       200:
 *         description: Usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     last24h:
 *                       type: object
 *                       properties:
 *                         totalRequests:
 *                           type: integer
 *                         usedCount:
 *                           type: integer
 *                         editedCount:
 *                           type: integer
 *                         avgGenerationTimeMs:
 *                           type: integer
 *                         lastRequest:
 *                           type: string
 *                           format: date-time
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE was_used = true) as used_count,
        COUNT(*) FILTER (WHERE was_edited = true) as edited_count,
        AVG(generation_time_ms) as avg_generation_time,
        MAX(created_at) as last_request
      FROM extension_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const stats = result.rows[0];

    const response: ApiResponse = {
      success: true,
      data: {
        last24h: {
          totalRequests: parseInt(stats.total_requests) || 0,
          usedCount: parseInt(stats.used_count) || 0,
          editedCount: parseInt(stats.edited_count) || 0,
          avgGenerationTimeMs: Math.round(parseFloat(stats.avg_generation_time) || 0),
          lastRequest: stats.last_request
        }
      }
    };
    res.json(response);

  } catch (error) {
    console.error('[Extension] Stats error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get stats'
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/extension/personas:
 *   get:
 *     summary: Get list of available AI personas
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 *     responses:
 *       200:
 *         description: List of personas
 */
router.get('/personas', async (req: Request, res: Response) => {
  try {
    const personaIds = getAvailablePersonas();
    const personas = personaIds.map(id => getPersonaDetails(id)).filter(Boolean);

    const response: ApiResponse = {
      success: true,
      data: {
        personas,
        count: personas.length
      }
    };
    res.json(response);

  } catch (error) {
    console.error('[Extension] Personas error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get personas'
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/extension/personas/{personaId}:
 *   get:
 *     summary: Get specific persona details
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 */
router.get('/personas/:personaId', async (req: Request, res: Response) => {
  try {
    const { personaId } = req.params;
    const persona = getPersonaDetails(personaId);

    if (!persona) {
      const response: ApiResponse = {
        success: false,
        error: 'Persona not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: persona
    };
    res.json(response);

  } catch (error) {
    console.error('[Extension] Persona error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get persona'
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/extension/sync:
 *   post:
 *     summary: Sync OnlyFans chat/messages from Chrome Extension
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chatUrl, fanUsername, messages]
 *             properties:
 *               chatUrl:
 *                 type: string
 *                 description: OF chat URL (contains fan ID)
 *               fanUsername:
 *                 type: string
 *               fanDisplayName:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     isFromCreator:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                     hasMedia:
 *                       type: boolean
 *                     isPPV:
 *                       type: boolean
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { chatUrl, fanUsername, fanDisplayName, messages, modelId } = req.body;

    if (!chatUrl || !fanUsername || !messages) {
      return res.status(400).json({
        success: false,
        error: 'chatUrl, fanUsername, and messages are required'
      });
    }

    // Extract fan ID from URL (e.g., /my/chats/chat/195935586/)
    const fanIdMatch = chatUrl.match(/\/chat\/(\d+)/);
    const fanOfId = fanIdMatch ? fanIdMatch[1] : fanUsername;

    console.log(`[Extension] Sync: ${messages.length} messages from ${fanUsername} (${fanOfId})`);

    // Find or create chat
    let chatResult = await pool.query(
      `SELECT id FROM chats WHERE fan_of_id = $1`,
      [fanOfId]
    );

    let chatId: string;

    if (chatResult.rows.length === 0) {
      // Create new chat
      const insertChat = await pool.query(
        `INSERT INTO chats (fan_of_id, fan_username, fan_display_name, model_id, platform)
         VALUES ($1, $2, $3, $4, 'onlyfans')
         ON CONFLICT (model_id, fan_of_id) DO UPDATE SET
           fan_username = EXCLUDED.fan_username,
           fan_display_name = EXCLUDED.fan_display_name,
           updated_at = NOW()
         RETURNING id`,
        [fanOfId, fanUsername, fanDisplayName || fanUsername, modelId || null]
      );
      chatId = insertChat.rows[0].id;
      console.log(`[Extension] Created new chat: ${chatId}`);
    } else {
      chatId = chatResult.rows[0].id;
    }

    // Sync messages
    let newMessages = 0;
    for (const msg of messages) {
      // Use timestamp + text hash as unique identifier
      const msgHash = `${msg.timestamp || ''}-${(msg.text || '').substring(0, 50)}`;

      const existing = await pool.query(
        `SELECT id FROM messages WHERE chat_id = $1 AND of_message_id = $2`,
        [chatId, msgHash]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO messages (chat_id, of_message_id, direction, content, has_media, is_ppv, platform, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'onlyfans', $7)`,
          [
            chatId,
            msgHash,
            msg.isFromCreator ? 'outgoing' : 'incoming',
            msg.text || '',
            msg.hasMedia || false,
            msg.isPPV || false,
            msg.timestamp ? new Date(msg.timestamp) : new Date()
          ]
        );
        newMessages++;
      }
    }

    // Update chat stats
    await pool.query(
      `UPDATE chats SET
         total_messages = (SELECT COUNT(*) FROM messages WHERE chat_id = $1),
         last_message_at = (SELECT MAX(created_at) FROM messages WHERE chat_id = $1),
         last_message_preview = $2,
         updated_at = NOW()
       WHERE id = $1`,
      [chatId, messages[messages.length - 1]?.text?.substring(0, 100) || '']
    );

    res.json({
      success: true,
      data: {
        chatId,
        syncedMessages: newMessages,
        totalMessages: messages.length
      }
    });

  } catch (error) {
    console.error('[Extension] Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync messages'
    });
  }
});

/**
 * @swagger
 * /api/extension/chats:
 *   get:
 *     summary: Get synced OnlyFans chats
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 */
router.get('/chats', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.fan_of_id,
        c.fan_username,
        c.fan_display_name,
        c.total_messages,
        c.last_message_at,
        c.last_message_preview,
        c.created_at
      FROM chats c
      WHERE c.platform = 'onlyfans' OR c.platform IS NULL
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT 50
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('[Extension] Get chats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chats'
    });
  }
});

/**
 * @swagger
 * /api/extension/chats/{chatId}/messages:
 *   get:
 *     summary: Get messages for a synced OnlyFans chat
 *     tags: [Extension]
 *     security:
 *       - ExtensionKey: []
 */
router.get('/chats/:chatId/messages', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await pool.query(`
      SELECT
        id,
        direction,
        content,
        has_media,
        is_ppv,
        created_at
      FROM messages
      WHERE chat_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `, [chatId, limit]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('[Extension] Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

/**
 * Helper: Log extension response to database
 */
async function logExtensionResponse(data: {
  fanMessage: string;
  fanName: string;
  modelUsername: string;
  personaId: string;
  generatedResponse: string;
  generationTimeMs: number;
}): Promise<string> {
  const result = await pool.query(
    `INSERT INTO extension_logs
     (fan_message, fan_name, model_username, persona_id, generated_response, generation_time_ms)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.fanMessage, data.fanName, data.modelUsername, data.personaId, data.generatedResponse, data.generationTimeMs]
  );

  return result.rows[0].id;
}

export default router;
