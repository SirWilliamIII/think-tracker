import { Router, Request, Response } from 'express'
import { captureMessage, getMessage } from '../db/index.js'
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/api-response.js'
import { validateMessageInput } from '../utils/validation.js'
import { ValidationError } from '../utils/errors.js'
import type { CaptureMessageInput } from '../types/index.js'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CaptureMessageInput = req.body

    try {
      validateMessageInput(input)
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error)
        return
      }
      throw error
    }

    const message = await captureMessage(input)
    sendCreated(res, { message })
  } catch (error) {
    sendError(res, error, 'capturing message')
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const message = await getMessage(req.params.id)
    if (!message) {
      sendNotFound(res, 'Message')
      return
    }
    sendSuccess(res, { message })
  } catch (error) {
    sendError(res, error, 'fetching message')
  }
})

export default router
