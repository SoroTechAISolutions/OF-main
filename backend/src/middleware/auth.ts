// ============================================
// JWT Authentication Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, ApiResponse } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to verify JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    const response: ApiResponse = {
      success: false,
      error: 'No authorization header provided'
    };
    return res.status(401).json(response);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid authorization header format. Use: Bearer <token>'
    };
    return res.status(401).json(response);
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      const response: ApiResponse = {
        success: false,
        error: 'Token expired'
      };
      return res.status(401).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: 'Invalid token'
    };
    return res.status(401).json(response);
  }
}

/**
 * Middleware to check user role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required'
      };
      return res.status(401).json(response);
    }

    if (!roles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`
      };
      return res.status(403).json(response);
    }

    next();
  };
}

/**
 * Generate JWT tokens
 */
export function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export { JWT_SECRET };
