// src/routes/sessions.ts
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

const router = Router()

// List all sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0)

    const result = await listSessions(limit, offset)
    res.json({
      success: true,
      ...result,
      has_more: result.total > offset + result.sessions.length
    })
  } catch (error) {
    console.error('Error listing sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list sessions'
    })
  }
})

// Create a new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, project_path, metadata } = req.body

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Session name is required'
      })
      return
    }

    const session = await createSession({ name, project_path, metadata })
    res.status(201).json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    })
  }
})

// Get a specific session
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req.params.id)
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      })
      return
    }
    res.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Error getting session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get session'
    })
  }
})

// End a session
router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const session = await endSession(req.params.id)
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      })
      return
    }
    res.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Error ending session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to end session'
    })
  }
})

// Delete a session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteSession(req.params.id)
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      })
      return
    }
    res.json({
      success: true,
      message: 'Session deleted'
    })
  } catch (error) {
    console.error('Error deleting session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete session'
    })
  }
})

// Get session messages
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 100))
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0)

    const result = await getSessionMessages(req.params.id, limit, offset)
    res.json({
      success: true,
      ...result,
      has_more: result.total > offset + result.messages.length
    })
  } catch (error) {
    console.error('Error getting messages:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    })
  }
})

// Get session statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getSessionStats(req.params.id)
    if (!stats) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      })
      return
    }
    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error getting session stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get session stats'
    })
  }
})

export default router
