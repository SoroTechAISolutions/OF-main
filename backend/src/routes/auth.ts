// ============================================
// Authentication Routes
// ============================================

import { Router, Request, Response } from 'express';
import { registerUser, loginUser, getUserById, emailExists } from '../services/authService';
import { authenticate, generateTokens, verifyRefreshToken } from '../middleware/auth';
import { ApiResponse, LoginRequest, RegisterRequest } from '../types';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user and agency
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, agency_name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *               agency_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already registered
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, agency_name } = req.body as RegisterRequest;

    // Validate input
    if (!email || !password || !name || !agency_name) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: email, password, name, agency_name'
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

    // Register user
    const result = await registerUser({ email, password, name, agency_name });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Registration successful'
    };
    res.status(201).json(response);

  } catch (error) {
    console.error('Registration error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Registration failed'
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT tokens
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validate input
    if (!email || !password) {
      const response: ApiResponse = {
        success: false,
        error: 'Email and password are required'
      };
      return res.status(400).json(response);
    }

    // Attempt login
    const result = await loginUser(email, password);

    if (!result) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid email or password'
      };
      return res.status(401).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Login successful'
    };
    res.json(response);

  } catch (error: any) {
    console.error('Login error:', error);

    if (error.message === 'Account is deactivated') {
      const response: ApiResponse = {
        success: false,
        error: 'Account is deactivated'
      };
      return res.status(403).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: 'Login failed'
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens generated
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        error: 'Refresh token is required'
      };
      return res.status(400).json(response);
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired refresh token'
      };
      return res.status(401).json(response);
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: payload.userId,
      agencyId: payload.agencyId,
      role: payload.role
    });

    const response: ApiResponse = {
      success: true,
      data: tokens,
      message: 'Tokens refreshed'
    };
    res.json(response);

  } catch (error) {
    console.error('Token refresh error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Token refresh failed'
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.userId);

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
      error: 'Failed to get user info'
    };
    res.status(500).json(response);
  }
});

export default router;
