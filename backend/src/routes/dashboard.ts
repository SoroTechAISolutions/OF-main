// ============================================
// Dashboard Routes - Aggregated Stats & Activity
// ============================================

import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { authenticate } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

/**
 * GET /api/dashboard/stats
 * Get aggregated dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const agencyId = req.user?.agencyId;
    console.log('Dashboard stats - agencyId:', agencyId, 'user:', req.user);

    // Get models count
    const modelsResult = await pool.query(
      'SELECT COUNT(*) as total FROM models WHERE agency_id = $1',
      [agencyId]
    );

    // Get AI responses stats for last 24h (from ai_responses - webhook responses)
    const aiStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_requests,
        COUNT(*) as used_count,
        COALESCE(AVG(latency_ms), 0) as avg_response_time
      FROM ai_responses
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    // Get AI responses for today vs yesterday (for comparison)
    const todayResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM ai_responses
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const yesterdayResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM ai_responses
      WHERE created_at > NOW() - INTERVAL '48 hours'
        AND created_at <= NOW() - INTERVAL '24 hours'
    `);

    const todayCount = parseInt(todayResult.rows[0]?.count || '0');
    const yesterdayCount = parseInt(yesterdayResult.rows[0]?.count || '0');
    const percentChange = yesterdayCount > 0
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
      : (todayCount > 0 ? 100 : 0);

    // Get total messages (from chats table if exists)
    let totalMessages = 0;
    try {
      const messagesResult = await pool.query(`
        SELECT COUNT(*) as total FROM messages m
        JOIN chats c ON m.chat_id = c.id
        JOIN models mo ON c.model_id = mo.id
        WHERE mo.agency_id = $1
      `, [agencyId]);
      totalMessages = parseInt(messagesResult.rows[0]?.total || '0');
    } catch (e) {
      // Table might not exist or be empty
    }

    res.json({
      success: true,
      data: {
        activeModels: parseInt(modelsResult.rows[0]?.total || '0'),
        aiResponsesToday: todayCount,
        aiResponsesChange: percentChange,
        avgResponseTime: Math.round(parseFloat(aiStatsResult.rows[0]?.avg_response_time || '0') / 1000 * 10) / 10, // Convert to seconds
        totalMessages,
        usedCount: parseInt(aiStatsResult.rows[0]?.used_count || '0'),
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
});

/**
 * GET /api/dashboard/activity
 * Get recent activity log
 */
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // Get recent AI generations from ai_responses (webhook) table
    const result = await pool.query(`
      SELECT
        ar.id,
        m.display_name as model_name,
        LEFT(ar.input_text, 50) as fan_message,
        ar.latency_ms,
        ar.created_at
      FROM ai_responses ar
      LEFT JOIN models m ON ar.model_id = m.id
      ORDER BY ar.created_at DESC
      LIMIT $1
    `, [limit]);

    const activities = result.rows.map(row => ({
      id: row.id,
      model: row.model_name || 'Unknown',
      action: 'AI response sent',
      fanName: row.fan_message ? row.fan_message.substring(0, 30) + '...' : 'Unknown',
      persona: 'auto',
      time: row.created_at,
      responseTime: row.latency_ms
    }));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity'
    });
  }
});

export default router;
