import { Router, Request, Response } from 'express'
import { captureMessage, getMessage } from '../db/index.js'
import type { CaptureMessageInput } from '../types/index.js'

const router = Router()

/**
 * POST /api/messages
 * Capture a new message with thinking data
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CaptureMessageInput = req.body

    // Validate required fields
    if (!input.session_id || !input.role || !input.content) {
      res.status(400).json({
        error: 'Missing required fields: session_id, role, content'
      })
      return
    }

    // Validate role
    if (!['user', 'assistant', 'system'].includes(input.role)) {
      res.status(400).json({
        error: 'Invalid role. Must be: user, assistant, or system'
      })
      return
    }

    const message = await captureMessage(input)
    res.status(201).json(message)
  } catch (error) {
    console.error('Error capturing message:', error)
    res.status(500).json({ error: 'Failed to capture message' })
  }
})

/**
 * GET /api/messages/:id
 * Get a specific message by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const message = await getMessage(id)

    if (!message) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    res.json(message)
  } catch (error) {
    console.error('Error fetching message:', error)
    res.status(500).json({ error: 'Failed to fetch message' })
  }
})

export default router
