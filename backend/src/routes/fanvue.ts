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

// ============================================
// OAuth Callback (NO AUTH - redirect from Fanvue)
// ============================================

/**
 * @swagger
 * /api/fanvue/oauth/callback:
 *   get:
 *     summary: Fanvue OAuth callback (no auth required)
 *     tags: [Fanvue]
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

    // Save tokens
    await saveFanvueTokens(
      tokens.modelId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn
    );

    // Fetch profile and update with UUID
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
    }

    // Show success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fanvue Connected!</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .card { background: white; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
          h1 { color: #22c55e; margin-bottom: 10px; }
          p { color: #666; }
          .check { font-size: 64px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="check">✅</div>
          <h1>Fanvue Connected!</h1>
          <p>Your account is now linked.</p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">Model ID: ${tokens.modelId}</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Fanvue OAuth callback error:', error);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e; }
          .card { background: white; padding: 40px; border-radius: 16px; text-align: center; }
          h1 { color: #ef4444; }
          .icon { font-size: 64px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">❌</div>
          <h1>Connection Failed</h1>
          <p>Please try again or contact support.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// ============================================
// Quick OAuth Init (TEMPORARY - no auth for emergency re-auth)
// ============================================
router.get('/oauth/quick-init', async (req: Request, res: Response) => {
  try {
    const modelId = req.query.modelId as string || 'd28611ae-23d7-4160-a476-5d59b7ff1d8c';
    const { authUrl } = await startOAuthFlow(modelId);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Quick OAuth init error:', error);
    res.status(500).json({ error: 'Failed to start OAuth' });
  }
});

// ============================================
// Protected Routes (require authentication)
// ============================================
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
  } catch (error: any) {
    console.error('Fanvue send message error:', error);
    // Pass through the actual error message from Fanvue
    const errorMessage = error?.message || 'Failed to send message';
    res.status(500).json({
      success: false,
      error: errorMessage
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
