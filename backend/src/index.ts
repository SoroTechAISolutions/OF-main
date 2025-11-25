import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { testDbConnection } from './db/connection';
import { testRedisConnection } from './db/redis';
import healthRouter from './routes/health';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/health', healthRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'OF Agency API',
    version: '1.0.0',
    status: 'running'
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
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
