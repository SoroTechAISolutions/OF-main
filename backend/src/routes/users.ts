// ============================================
// Users Routes (Team Management)
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getUsersByAgency,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  deleteUser,
  emailExists
} from '../services/userService';
import { ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * Get all users for current agency
 * Only owner and admin can list users
 */
router.get('/', requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await getUsersByAgency(req.user!.agencyId, {
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
    console.error('Get users error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get users'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id, req.user!.agencyId);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { user }
    };
    res.json(response);

  } catch (error) {
    console.error('Get user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get user'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/users
 * Create new team member
 * Only owner can create users
 */
router.post('/', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name) {
      const response: ApiResponse = {
        success: false,
        error: 'email, password, and name are required'
      };
      return res.status(400).json(response);
    }

    // Validate role
    if (role && !['admin', 'chatter'].includes(role)) {
      const response: ApiResponse = {
        success: false,
        error: 'role must be "admin" or "chatter"'
      };
      return res.status(400).json(response);
    }

    // Check if email already exists
    if (await emailExists(email)) {
      const response: ApiResponse = {
        success: false,
        error: 'Email already registered'
      };
      return res.status(409).json(response);
    }

    const user = await createUser(req.user!.agencyId, {
      email,
      password,
      name,
      role
    });

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'User created successfully'
    };
    res.status(201).json(response);

  } catch (error) {
    console.error('Create user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create user'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/users/:id
 * Update user
 * Owner can update anyone, admin can update chatters
 */
router.put('/:id', requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const targetUser = await getUserById(req.params.id, req.user!.agencyId);

    if (!targetUser) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    // Admin can only update chatters
    if (req.user!.role === 'admin' && targetUser.role !== 'chatter') {
      const response: ApiResponse = {
        success: false,
        error: 'Admins can only update chatters'
      };
      return res.status(403).json(response);
    }

    // Can't change owner role
    if (targetUser.role === 'owner' && req.body.role) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot change owner role'
      };
      return res.status(403).json(response);
    }

    const user = await updateUser(req.params.id, req.user!.agencyId, req.body);

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'User updated successfully'
    };
    res.json(response);

  } catch (error) {
    console.error('Update user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update user'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/users/:id/password
 * Change user password
 * Only owner can change passwords
 */
router.put('/:id/password', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      const response: ApiResponse = {
        success: false,
        error: 'Password must be at least 6 characters'
      };
      return res.status(400).json(response);
    }

    const success = await changeUserPassword(req.params.id, req.user!.agencyId, password);

    if (!success) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully'
    };
    res.json(response);

  } catch (error) {
    console.error('Change password error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to change password'
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/users/:id
 * Delete user
 * Only owner can delete users
 */
router.delete('/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    // Can't delete yourself
    if (req.params.id === req.user!.userId) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot delete yourself'
      };
      return res.status(400).json(response);
    }

    const deleted = await deleteUser(req.params.id, req.user!.agencyId);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found or cannot be deleted'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully'
    };
    res.json(response);

  } catch (error) {
    console.error('Delete user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete user'
    };
    res.status(500).json(response);
  }
});

export default router;
