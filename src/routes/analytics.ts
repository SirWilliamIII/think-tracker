import { Router, Request, Response } from 'express'
import { getOverallStats, getDailyStats, getToolUsageStats } from '../db/index.js'
import type {} from '../types/index.js'

const router = Router()

/**
 * GET /api/analytics/overview
 * Get overall usage statistics
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const stats = await getOverallStats()
    res.json(stats)
  } catch (error) {
    console.error('Error fetching overview stats:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

/**
 * GET /api/analytics/daily
 * Get daily activity statistics
 */
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query
    const numDays = Math.min(parseInt(days as string, 10) || 30, 365)

    const stats = await getDailyStats(numDays)
    res.json(stats)
  } catch (error) {
    console.error('Error fetching daily stats:', error)
    res.status(500).json({ error: 'Failed to fetch daily statistics' })
  }
})

/**
 * GET /api/analytics/tools
 * Get tool usage statistics
 */
router.get('/tools', async (req: Request, res: Response) => {
  try {
    const stats = await getToolUsageStats()
    res.json(stats)
  } catch (error) {
    console.error('Error fetching tool stats:', error)
    res.status(500).json({ error: 'Failed to fetch tool statistics' })
  }
})

export default router
