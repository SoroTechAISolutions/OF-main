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

    // Get AI responses stats for last 24h
    const aiStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_requests,
        COUNT(CASE WHEN was_used = true THEN 1 END) as used_count,
        COALESCE(AVG(generation_time_ms), 0) as avg_response_time
      FROM extension_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    // Get AI responses for today vs yesterday (for comparison)
    const todayResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM extension_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const yesterdayResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM extension_logs
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

    // Get recent AI generations
    const result = await pool.query(`
      SELECT
        el.id,
        el.model_username,
        el.fan_name,
        el.persona_id,
        el.was_used,
        el.generation_time_ms,
        el.created_at
      FROM extension_logs el
      ORDER BY el.created_at DESC
      LIMIT $1
    `, [limit]);

    const activities = result.rows.map(row => ({
      id: row.id,
      model: row.model_username || 'Unknown',
      action: row.was_used ? 'AI response sent' : 'AI response generated',
      fanName: row.fan_name,
      persona: row.persona_id,
      time: row.created_at,
      responseTime: row.generation_time_ms
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
