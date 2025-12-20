// ============================================
// Fanvue API Routes
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  startOAuthFlow,
  exchangeCodeForTokens,
  saveFanvueTokens,
  revokeFanvueTokens,
  getFanvueInfo
} from '../services/fanvueOAuthService';
import {
  getChats,
  getChatMessages,
  sendMessage,
  sendMassMessage,
  getSubscribers,
  getCreatorProfile,
  syncAllChats
} from '../services/fanvueService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// OAuth Routes
// ============================================

/**
 * @swagger
 * /api/fanvue/auth/start:
 *   post:
 *     summary: Start Fanvue OAuth flow
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - modelId
 *             properties:
 *               modelId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Authorization URL to redirect user
 */
router.post('/auth/start', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'modelId is required'
      });
    }

    const { authUrl, state } = startOAuthFlow(modelId);

    res.json({
      success: true,
      data: { authUrl, state }
    });
  } catch (error) {
    console.error('Fanvue auth start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start OAuth flow'
    });
  }
});

/**
 * @swagger
 * /api/fanvue/oauth/callback:
 *   get:
 *     summary: Fanvue OAuth callback
 *     tags: [Fanvue]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to dashboard
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Fanvue OAuth error:', error);
      return res.redirect('/dashboard?fanvue=error&reason=' + error);
    }

    if (!code || !state) {
      return res.redirect('/dashboard?fanvue=error&reason=missing_params');
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code as string,
      state as string
    );

    // Get creator profile to get UUID and username
    // Note: We need to save tokens first to make API calls
    await saveFanvueTokens(
      tokens.modelId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn
    );

    // Now fetch profile and update with UUID
    try {
      const profile = await getCreatorProfile(tokens.modelId);
      await saveFanvueTokens(
        tokens.modelId,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn,
        profile.uuid,
        profile.username
      );
    } catch (profileError) {
      console.error('Failed to fetch Fanvue profile:', profileError);
      // Continue anyway, tokens are saved
    }

    // Redirect to dashboard with success
    res.redirect('/dashboard?fanvue=connected&model=' + tokens.modelId);
  } catch (error) {
    console.error('Fanvue OAuth callback error:', error);
    res.redirect('/dashboard?fanvue=error&reason=token_exchange_failed');
  }
});

/**
 * @swagger
 * /api/fanvue/disconnect:
 *   post:
 *     summary: Disconnect Fanvue from model
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'modelId is required'
      });
    }

    await revokeFanvueTokens(modelId);

    res.json({
      success: true,
      message: 'Fanvue disconnected successfully'
    });
  } catch (error) {
    console.error('Fanvue disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Fanvue'
    });
  }
});

/**
 * @swagger
 * /api/fanvue/status/{modelId}:
 *   get:
 *     summary: Get Fanvue connection status
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 */
router.get('/status/:modelId', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const info = await getFanvueInfo(modelId);

    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('Fanvue status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Fanvue status'
    });
  }
});

// ============================================
// Chat Routes
// ============================================

/**
 * @swagger
 * /api/fanvue/chats/{modelId}:
 *   get:
 *     summary: Get Fanvue chats for model
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 */
router.get('/chats/:modelId', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const { limit, cursor, filter } = req.query;

    const result = await getChats(modelId, {
      limit: limit ? parseInt(limit as string) : undefined,
      cursor: cursor as string,
      filter: filter as 'all' | 'unread' | 'priority'
    });

    res.json({
      success: true,
      data: result.chats,
      pagination: { nextCursor: result.nextCursor }
    });
  } catch (error) {
    console.error('Fanvue get chats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chats'
    });
  }
});

/**
 * @swagger
 * /api/fanvue/chats/{modelId}/{fanUserUuid}/messages:
 *   get:
 *     summary: Get messages for a Fanvue chat
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 */
router.get('/chats/:modelId/:fanUserUuid/messages', async (req: Request, res: Response) => {
  try {
    const { modelId, fanUserUuid } = req.params;
    const { limit, cursor } = req.query;

    const result = await getChatMessages(modelId, fanUserUuid, {
      limit: limit ? parseInt(limit as string) : undefined,
      cursor: cursor as string
    });

    res.json({
      success: true,
      data: result.messages,
      pagination: { nextCursor: result.nextCursor }
    });
  } catch (error) {
    console.error('Fanvue get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

/**
 * @swagger
 * /api/fanvue/chats/{modelId}/{fanUserUuid}/message:
 *   post:
 *     summary: Send message to fan via Fanvue
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chats/:modelId/:fanUserUuid/message', async (req: Request, res: Response) => {
  try {
    const { modelId, fanUserUuid } = req.params;
    const { content, price, mediaIds } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required'
      });
    }

    const message = await sendMessage(modelId, fanUserUuid, content, {
      price,
      mediaIds
    });

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Fanvue send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * @swagger
 * /api/fanvue/mass-message/{modelId}:
 *   post:
 *     summary: Send mass message via Fanvue
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 */
router.post('/mass-message/:modelId', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const { content, price, mediaIds, targetUserUuids, filters } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required'
      });
    }

    const result = await sendMassMessage(modelId, content, {
      price,
      mediaIds,
      targetUserUuids,
      filters
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Fanvue mass message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send mass message'
    });
  }
});

// ============================================
// Subscriber Routes
// ============================================

/**
 * @swagger
 * /api/fanvue/subscribers/{modelId}:
 *   get:
 *     summary: Get Fanvue subscribers for model
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 */
router.get('/subscribers/:modelId', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const { limit, cursor, status, sortBy } = req.query;

    const result = await getSubscribers(modelId, {
      limit: limit ? parseInt(limit as string) : undefined,
      cursor: cursor as string,
      status: status as 'active' | 'expired' | 'all',
      sortBy: sortBy as 'recent' | 'totalSpent' | 'alphabetical'
    });

    res.json({
      success: true,
      data: result.subscribers,
      pagination: { nextCursor: result.nextCursor }
    });
  } catch (error) {
    console.error('Fanvue get subscribers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscribers'
    });
  }
});

// ============================================
// Sync Routes
// ============================================

/**
 * @swagger
 * /api/fanvue/sync/{modelId}:
 *   post:
 *     summary: Sync Fanvue data to local database
 *     tags: [Fanvue]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sync/:modelId', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;

    const syncedChats = await syncAllChats(modelId);

    res.json({
      success: true,
      data: {
        syncedChats
      }
    });
  } catch (error) {
    console.error('Fanvue sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Fanvue data'
    });
  }
});

export default router;
