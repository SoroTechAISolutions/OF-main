// ============================================
// Chats & Messages Routes
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getChatsByModel,
  getChatById,
  getOrCreateChat,
  updateChat,
  getMessagesByChat,
  createMessage,
  markMessageRead,
  markPpvUnlocked
} from '../services/chatService';
import { getModelById } from '../services/modelService';
import { ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== CHATS ====================

/**
 * GET /api/chats/model/:modelId
 * Get all chats for a model
 */
router.get('/model/:modelId', async (req: Request, res: Response) => {
  try {
    // Verify model belongs to agency
    const model = await getModelById(req.params.modelId, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Model not found'
      };
      return res.status(404).json(response);
    }

    const { page, limit } = req.query;

    const result = await getChatsByModel(req.params.modelId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };
    res.json(response);

  } catch (error) {
    console.error('Get chats error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get chats'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/chats/:id
 * Get chat by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const chat = await getChatById(req.params.id);

    if (!chat) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    // Verify chat belongs to agency via model
    const model = await getModelById(chat.model_id, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { chat }
    };
    res.json(response);

  } catch (error) {
    console.error('Get chat error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get chat'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/chats
 * Create or get existing chat
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { model_id, fan_of_id, fan_username, fan_avatar_url } = req.body;

    if (!model_id || !fan_of_id || !fan_username) {
      const response: ApiResponse = {
        success: false,
        error: 'model_id, fan_of_id, and fan_username are required'
      };
      return res.status(400).json(response);
    }

    // Verify model belongs to agency
    const model = await getModelById(model_id, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Model not found'
      };
      return res.status(404).json(response);
    }

    const chat = await getOrCreateChat(model_id, fan_of_id, fan_username, fan_avatar_url);

    const response: ApiResponse = {
      success: true,
      data: { chat }
    };
    res.json(response);

  } catch (error) {
    console.error('Create chat error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create chat'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/chats/:id
 * Update chat
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existingChat = await getChatById(req.params.id);

    if (!existingChat) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    // Verify chat belongs to agency via model
    const model = await getModelById(existingChat.model_id, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    const chat = await updateChat(req.params.id, req.body);

    const response: ApiResponse = {
      success: true,
      data: { chat },
      message: 'Chat updated successfully'
    };
    res.json(response);

  } catch (error) {
    console.error('Update chat error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update chat'
    };
    res.status(500).json(response);
  }
});

// ==================== MESSAGES ====================

/**
 * GET /api/chats/:chatId/messages
 * Get messages for a chat
 */
router.get('/:chatId/messages', async (req: Request, res: Response) => {
  try {
    const chat = await getChatById(req.params.chatId);

    if (!chat) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    // Verify chat belongs to agency via model
    const model = await getModelById(chat.model_id, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    const { page, limit } = req.query;

    const result = await getMessagesByChat(req.params.chatId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };
    res.json(response);

  } catch (error) {
    console.error('Get messages error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get messages'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/chats/:chatId/messages
 * Create new message
 */
router.post('/:chatId/messages', async (req: Request, res: Response) => {
  try {
    const chat = await getChatById(req.params.chatId);

    if (!chat) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    // Verify chat belongs to agency via model
    const model = await getModelById(chat.model_id, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    const { direction, content, of_message_id, has_media, media_type, media_count, is_ppv, ppv_price, sent_by_ai } = req.body;

    if (!direction || !['incoming', 'outgoing'].includes(direction)) {
      const response: ApiResponse = {
        success: false,
        error: 'direction is required and must be "incoming" or "outgoing"'
      };
      return res.status(400).json(response);
    }

    const message = await createMessage({
      chatId: req.params.chatId,
      ofMessageId: of_message_id,
      direction,
      content,
      hasMedia: has_media,
      mediaType: media_type,
      mediaCount: media_count,
      isPpv: is_ppv,
      ppvPrice: ppv_price,
      sentByUserId: req.user!.userId,
      sentByAi: sent_by_ai
    });

    const response: ApiResponse = {
      success: true,
      data: { message },
      message: 'Message created successfully'
    };
    res.status(201).json(response);

  } catch (error) {
    console.error('Create message error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create message'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/chats/:chatId/messages/:messageId/read
 * Mark message as read
 */
router.put('/:chatId/messages/:messageId/read', async (req: Request, res: Response) => {
  try {
    const chat = await getChatById(req.params.chatId);

    if (!chat) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    // Verify chat belongs to agency via model
    const model = await getModelById(chat.model_id, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    await markMessageRead(req.params.messageId);

    const response: ApiResponse = {
      success: true,
      message: 'Message marked as read'
    };
    res.json(response);

  } catch (error) {
    console.error('Mark message read error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to mark message as read'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/chats/:chatId/messages/:messageId/unlock
 * Mark PPV message as unlocked
 */
router.put('/:chatId/messages/:messageId/unlock', async (req: Request, res: Response) => {
  try {
    const chat = await getChatById(req.params.chatId);

    if (!chat) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    // Verify chat belongs to agency via model
    const model = await getModelById(chat.model_id, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Chat not found'
      };
      return res.status(404).json(response);
    }

    await markPpvUnlocked(req.params.messageId);

    const response: ApiResponse = {
      success: true,
      message: 'PPV message unlocked'
    };
    res.json(response);

  } catch (error) {
    console.error('Unlock PPV error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to unlock PPV message'
    };
    res.status(500).json(response);
  }
});

export default router;
