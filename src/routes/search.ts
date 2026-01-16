import { Router, Request, Response } from 'express'
import { searchMessages } from '../db/index.js'
import type { SearchOptions } from '../types/index.js'

const router = Router()

/**
 * GET /api/search
 * Full-text search across messages and thinking content
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      q,
      session_id,
      role,
      limit = '50',
      offset = '0',
      search_thinking = 'true'
    } = req.query

    // Validate query
    if (!q || typeof q !== 'string') {
      res.status(400).json({
        error: 'Search query (q) is required'
      })
      return
    }

    if (q.length < 2 || q.length > 500) {
      res.status(400).json({
        error: 'Search query must be between 2 and 500 characters'
      })
      return
    }

    // Validate role if provided
    if (role && !['user', 'assistant', 'system'].includes(role as string)) {
      res.status(400).json({
        error: 'Invalid role. Must be: user, assistant, or system'
      })
      return
    }

    const options: SearchOptions = {
      query: q,
      session_id: session_id as string | undefined,
      role: role as 'user' | 'assistant' | 'system' | undefined,
      limit: Math.min(parseInt(limit as string, 10) || 50, 100),
      offset: parseInt(offset as string, 10) || 0,
      search_thinking: search_thinking !== 'false'
    }

    const results = await searchMessages(options.query, {
      sessionId: options.session_id,
      role: options.role,
      limit: options.limit,
      offset: options.offset,
      searchThinking: options.search_thinking
    })
    res.json(results)
  } catch (error) {
    console.error('Error searching:', error)
    res.status(500).json({ error: 'Search failed' })
  }
})

export default router
