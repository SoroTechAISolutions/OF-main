// ============================================
// AI Generation Routes
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getModelById } from '../services/modelService';
import {
  generateAIResponse,
  logAIResponse,
  markAIResponseSent,
  getAIResponsesByModel,
  getAIAnalytics
} from '../services/aiService';
import { ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/ai/generate
 * Generate AI response for a fan message
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { model_id, fan_message, chat_history, log_response } = req.body;

    if (!model_id || !fan_message) {
      const response: ApiResponse = {
        success: false,
        error: 'model_id and fan_message are required'
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

    // Check if AI is enabled for model
    if (!model.ai_enabled) {
      const response: ApiResponse = {
        success: false,
        error: 'AI is disabled for this model'
      };
      return res.status(403).json(response);
    }

    // Generate AI response
    const aiResult = await generateAIResponse({
      modelId: model_id,
      fanMessage: fan_message,
      chatHistory: chat_history,
      personaPrompt: model.persona_prompt || undefined
    });

    // Optionally log to database
    let aiResponseId: string | undefined;
    if (log_response !== false) {
      const logged = await logAIResponse({
        modelId: model_id,
        fanMessage: fan_message,
        generatedResponse: aiResult.response,
        generationTimeMs: aiResult.generationTimeMs
      });
      aiResponseId = logged.id;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        response: aiResult.response,
        generation_time_ms: aiResult.generationTimeMs,
        ai_response_id: aiResponseId
      }
    };
    res.json(response);

  } catch (error) {
    console.error('AI generate error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate AI response'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/ai/log
 * Log AI response after generation (for extension use)
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const { model_id, message_id, fan_message, generated_response, generation_time_ms, tokens_used } = req.body;

    if (!model_id || !fan_message || !generated_response) {
      const response: ApiResponse = {
        success: false,
        error: 'model_id, fan_message, and generated_response are required'
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

    const logged = await logAIResponse({
      messageId: message_id,
      modelId: model_id,
      fanMessage: fan_message,
      generatedResponse: generated_response,
      generationTimeMs: generation_time_ms || 0,
      tokensUsed: tokens_used
    });

    const response: ApiResponse = {
      success: true,
      data: { ai_response: logged },
      message: 'AI response logged successfully'
    };
    res.status(201).json(response);

  } catch (error) {
    console.error('AI log error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to log AI response'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/ai/:id/sent
 * Mark AI response as sent
 */
router.put('/:id/sent', async (req: Request, res: Response) => {
  try {
    const { was_edited, edited_response } = req.body;

    await markAIResponseSent(
      req.params.id,
      was_edited || false,
      edited_response
    );

    const response: ApiResponse = {
      success: true,
      message: 'AI response marked as sent'
    };
    res.json(response);

  } catch (error) {
    console.error('AI mark sent error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to mark AI response as sent'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/ai/model/:modelId/responses
 * Get AI response history for a model
 */
router.get('/model/:modelId/responses', async (req: Request, res: Response) => {
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

    const { limit } = req.query;
    const responses = await getAIResponsesByModel(
      req.params.modelId,
      limit ? parseInt(limit as string) : 100
    );

    const response: ApiResponse = {
      success: true,
      data: { responses }
    };
    res.json(response);

  } catch (error) {
    console.error('Get AI responses error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get AI responses'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/ai/model/:modelId/analytics
 * Get AI analytics for a model
 */
router.get('/model/:modelId/analytics', async (req: Request, res: Response) => {
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

    const analytics = await getAIAnalytics(req.params.modelId);

    const response: ApiResponse = {
      success: true,
      data: { analytics }
    };
    res.json(response);

  } catch (error) {
    console.error('Get AI analytics error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get AI analytics'
    };
    res.status(500).json(response);
  }
});

export default router;
