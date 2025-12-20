// ============================================
// Models Routes (OF Accounts)
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getModelsByAgency,
  getModelById,
  getModelByUsername,
  createModel,
  updateModel,
  deleteModel,
  getModelStats
} from '../services/modelService';
import { ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/models
 * Get all models for current agency
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await getModelsByAgency(req.user!.agencyId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };
    res.json(response);

  } catch (error) {
    console.error('Get models error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get models'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/models/:id
 * Get model by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const model = await getModelById(req.params.id, req.user!.agencyId);

    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Model not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { model }
    };
    res.json(response);

  } catch (error) {
    console.error('Get model error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get model'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/models/:id/stats
 * Get model statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    // Verify model belongs to agency
    const model = await getModelById(req.params.id, req.user!.agencyId);
    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Model not found'
      };
      return res.status(404).json(response);
    }

    const stats = await getModelStats(req.params.id);

    const response: ApiResponse = {
      success: true,
      data: { stats }
    };
    res.json(response);

  } catch (error) {
    console.error('Get model stats error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get model stats'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/models/by-username/:username
 * Get model by OF username
 */
router.get('/by-username/:username', async (req: Request, res: Response) => {
  try {
    const model = await getModelByUsername(req.params.username, req.user!.agencyId);

    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Model not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { model }
    };
    res.json(response);

  } catch (error) {
    console.error('Get model by username error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get model'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/models
 * Create new model
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { of_username } = req.body;

    if (!of_username) {
      const response: ApiResponse = {
        success: false,
        error: 'of_username is required'
      };
      return res.status(400).json(response);
    }

    // Check if model already exists
    const existing = await getModelByUsername(of_username, req.user!.agencyId);
    if (existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Model with this username already exists'
      };
      return res.status(409).json(response);
    }

    const model = await createModel(req.user!.agencyId, req.body);

    const response: ApiResponse = {
      success: true,
      data: { model },
      message: 'Model created successfully'
    };
    res.status(201).json(response);

  } catch (error) {
    console.error('Create model error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create model'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/models/:id
 * Update model
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const model = await updateModel(req.params.id, req.user!.agencyId, req.body);

    if (!model) {
      const response: ApiResponse = {
        success: false,
        error: 'Model not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { model },
      message: 'Model updated successfully'
    };
    res.json(response);

  } catch (error) {
    console.error('Update model error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update model'
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/models/:id
 * Delete model
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteModel(req.params.id, req.user!.agencyId);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Model not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Model deleted successfully'
    };
    res.json(response);

  } catch (error) {
    console.error('Delete model error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete model'
    };
    res.status(500).json(response);
  }
});

export default router;
