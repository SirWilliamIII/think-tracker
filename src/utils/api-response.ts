/**
 * API response formatting utilities for Express routes
 * Ensures consistent response structure across all endpoints
 */

import type { Response } from 'express'
import { isAppError, formatErrorResponse } from './errors.js'

interface SuccessResponse<T> {
  success: true
  [key: string]: T | true
}

interface ErrorResponse {
  success: false
  error: string
  code?: string
}

/**
 * Sends a successful JSON response
 */
export function sendSuccess<T extends Record<string, unknown>>(
  res: Response,
  data: T,
  statusCode: number = 200
): void {
  res.status(statusCode).json({ success: true, ...data } satisfies SuccessResponse<unknown>)
}

/**
 * Sends a created (201) response
 */
export function sendCreated<T extends Record<string, unknown>>(res: Response, data: T): void {
  sendSuccess(res, data, 201)
}

/**
 * Sends an error response with appropriate status code
 */
export function sendError(res: Response, error: unknown, context?: string): void {
  const statusCode = isAppError(error) ? error.statusCode : 500
  const { message, code } = formatErrorResponse(error)

  if (context) {
    console.error(`Error ${context}:`, error)
  }

  const response: ErrorResponse = { success: false, error: message }
  if (code) response.code = code

  res.status(statusCode).json(response)
}

/**
 * Sends a 404 not found response
 */
export function sendNotFound(res: Response, resource: string): void {
  res.status(404).json({
    success: false,
    error: `${resource} not found`
  } satisfies ErrorResponse)
}

/**
 * Sends a 400 validation error response
 */
export function sendValidationError(res: Response, message: string): void {
  res.status(400).json({
    success: false,
    error: message,
    code: 'VALIDATION_ERROR'
  } satisfies ErrorResponse)
}

/**
 * Calculates pagination has_more flag
 */
export function hasMore(total: number, offset: number, resultCount: number): boolean {
  return total > offset + resultCount
}
