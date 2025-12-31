// ============================================
// OF Agency Platform - API Server
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { testDbConnection } from './db/connection';
import { testRedisConnection } from './db/redis';
import { swaggerSpec } from './config/swagger';
import { startAutoReplyWorker } from './workers/autoReplyWorker';

// Route imports
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import modelsRouter from './routes/models';
import chatsRouter from './routes/chats';
import aiRouter from './routes/ai';
import extensionRouter from './routes/extension';
import fanvueRouter from './routes/fanvue';
import fanvueWebhooksRouter from './routes/fanvueWebhooks';
import dashboardRouter from './routes/dashboard';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'chrome-extension://*',
    /\.sorotech\.ru$/
  ],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Disable caching for API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Swagger documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OF Agency API Docs'
}));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/models', modelsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/extension', extensionRouter);
app.use('/api/fanvue', fanvueRouter);
app.use('/api/webhooks/fanvue', fanvueWebhooksRouter);
app.use('/api/dashboard', dashboardRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'OF Agency API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      models: '/api/models',
      chats: '/api/chats',
      ai: '/api/ai',
      fanvue: '/api/fanvue',
      webhooks: '/api/webhooks/fanvue'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await testDbConnection();
    console.log('PostgreSQL connected!');

    // Test Redis connection
    console.log('Testing Redis connection...');
    await testRedisConnection();
    console.log('Redis connected!');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
========================================
  OF Agency API Server
  Running on port ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
========================================`);

      // Start auto-reply worker (every 30 seconds)
      startAutoReplyWorker(30);
      console.log('Auto-reply worker started');

      console.log(`

Available endpoints:
  GET  /                     - API info
  GET  /health               - Health check

  POST /api/auth/register    - Register user
  POST /api/auth/login       - Login
  POST /api/auth/refresh     - Refresh token
  GET  /api/auth/me          - Current user

  GET  /api/users            - List team members
  GET  /api/users/:id        - Get user
  POST /api/users            - Create user
  PUT  /api/users/:id        - Update user
  PUT  /api/users/:id/password - Change password
  DEL  /api/users/:id        - Delete user

  GET  /api/models           - List models
  GET  /api/models/:id       - Get model
  GET  /api/models/:id/stats - Model stats
  POST /api/models           - Create model
  PUT  /api/models/:id       - Update model
  DEL  /api/models/:id       - Delete model

  GET  /api/chats/model/:id  - Chats by model
  GET  /api/chats/:id        - Get chat
  POST /api/chats            - Create chat
  PUT  /api/chats/:id        - Update chat
  GET  /api/chats/:id/msgs   - Get messages
  POST /api/chats/:id/msgs   - Create message

  POST /api/ai/generate      - Generate AI response
  POST /api/ai/log           - Log AI response
  PUT  /api/ai/:id/sent      - Mark as sent
  GET  /api/ai/model/:id/responses - AI history
  GET  /api/ai/model/:id/analytics - AI stats

Extension API (X-Extension-Key header):
  POST /api/extension/generate  - Generate AI (simplified)
  POST /api/extension/feedback  - Submit feedback
  GET  /api/extension/status    - API status
  GET  /api/extension/stats     - Usage stats

Fanvue API:
  POST /api/fanvue/auth/start     - Start OAuth flow
  GET  /api/fanvue/oauth/callback - OAuth callback
  POST /api/fanvue/disconnect     - Disconnect Fanvue
  GET  /api/fanvue/status/:id     - Connection status
  GET  /api/fanvue/chats/:id      - Get chats
  POST /api/fanvue/chats/:id/:fan/message - Send message
  POST /api/fanvue/mass-message/:id - Mass message
  GET  /api/fanvue/subscribers/:id  - Get subscribers
  POST /api/fanvue/sync/:id       - Sync Fanvue data

Webhooks:
  POST /api/webhooks/fanvue       - Fanvue events
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
