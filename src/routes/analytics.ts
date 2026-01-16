import { Router, Request, Response } from 'express'
import { getOverallStats, getDailyStats, getToolUsageStats } from '../db/index.js'
import { sendSuccess, sendError } from '../utils/api-response.js'
import { VALIDATION } from '../utils/constants.js'

const router = Router()

router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const stats = await getOverallStats()
    sendSuccess(res, { stats })
  } catch (error) {
    sendError(res, error, 'fetching overview stats')
  }
})

router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query
    const numDays = Math.min(
      parseInt(days as string, 10) || 30,
      VALIDATION.MAX_DAILY_STATS_DAYS
    )

    const stats = await getDailyStats(numDays)
    sendSuccess(res, { stats })
  } catch (error) {
    sendError(res, error, 'fetching daily stats')
  }
})

router.get('/tools', async (_req: Request, res: Response) => {
  try {
    const stats = await getToolUsageStats()
    sendSuccess(res, { stats })
  } catch (error) {
    sendError(res, error, 'fetching tool stats')
  }
})

export default router
