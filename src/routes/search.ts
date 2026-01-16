import { Router, Request, Response } from 'express'
import { searchMessages } from '../db/index.js'
import { sendSuccess, sendError } from '../utils/api-response.js'
import { validateSearchQuery, validateRole, parsePagination } from '../utils/validation.js'
import { ValidationError } from '../utils/errors.js'
import { PAGINATION } from '../utils/constants.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, session_id, role, limit, offset, search_thinking = 'true' } = req.query

    let query: string
    try {
      query = validateSearchQuery(q)
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error)
        return
      }
      throw error
    }

    if (role) {
      try {
        validateRole(role)
      } catch (error) {
        if (error instanceof ValidationError) {
          sendError(res, error)
          return
        }
        throw error
      }
    }

    const pagination = parsePagination(limit as string, offset as string, {
      maxLimit: PAGINATION.MAX_LIMIT
    })

    const results = await searchMessages(query, {
      sessionId: session_id as string | undefined,
      role: role as 'user' | 'assistant' | 'system' | undefined,
      limit: pagination.limit,
      offset: pagination.offset,
      searchThinking: search_thinking !== 'false'
    })

    sendSuccess(res, results)
  } catch (error) {
    sendError(res, error, 'searching')
  }
})

export default router
