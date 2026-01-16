import { Router, Request, Response } from 'express'
import {
  createSession,
  getSession,
  listSessions,
  endSession,
  deleteSession,
  getSessionMessages,
  getSessionStats
} from '../db/index.js'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendValidationError,
  hasMore
} from '../utils/api-response.js'
import { parsePagination, validateSessionName } from '../utils/validation.js'
import { PAGINATION } from '../utils/constants.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(
      req.query.limit as string,
      req.query.offset as string,
      { maxLimit: PAGINATION.MAX_LIMIT }
    )

    const result = await listSessions(limit, offset)
    sendSuccess(res, {
      ...result,
      has_more: hasMore(result.total, offset, result.sessions.length)
    })
  } catch (error) {
    sendError(res, error, 'listing sessions')
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, project_path, metadata } = req.body

    try {
      validateSessionName(name)
    } catch {
      sendValidationError(res, 'Session name is required')
      return
    }

    const session = await createSession({ name, project_path, metadata })
    sendCreated(res, { session })
  } catch (error) {
    sendError(res, error, 'creating session')
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req.params.id)
    if (!session) {
      sendNotFound(res, 'Session')
      return
    }
    sendSuccess(res, { session })
  } catch (error) {
    sendError(res, error, 'getting session')
  }
})

router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const session = await endSession(req.params.id)
    if (!session) {
      sendNotFound(res, 'Session')
      return
    }
    sendSuccess(res, { session })
  } catch (error) {
    sendError(res, error, 'ending session')
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteSession(req.params.id)
    if (!deleted) {
      sendNotFound(res, 'Session')
      return
    }
    sendSuccess(res, { message: 'Session deleted' })
  } catch (error) {
    sendError(res, error, 'deleting session')
  }
})

router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(
      req.query.limit as string,
      req.query.offset as string,
      { maxLimit: PAGINATION.MESSAGES_MAX_LIMIT, defaultLimit: PAGINATION.MESSAGES_DEFAULT_LIMIT }
    )

    const result = await getSessionMessages(req.params.id, limit, offset)
    sendSuccess(res, {
      ...result,
      has_more: hasMore(result.total, offset, result.messages.length)
    })
  } catch (error) {
    sendError(res, error, 'getting messages')
  }
})

router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getSessionStats(req.params.id)
    if (!stats) {
      sendNotFound(res, 'Session')
      return
    }
    sendSuccess(res, { stats })
  } catch (error) {
    sendError(res, error, 'getting session stats')
  }
})

export default router
