import { Router } from 'express';
import { pool } from '../db/connection';
import { getRedis } from '../db/redis';

const router = Router();

// Health check endpoint
router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'ok',
      database: 'unknown',
      redis: 'unknown'
    }
  };

  // Check PostgreSQL
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    health.services.database = 'ok';
  } catch (error) {
    health.services.database = 'error';
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const redis = await getRedis();
    await redis.ping();
    health.services.redis = 'ok';
  } catch (error) {
    health.services.redis = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
