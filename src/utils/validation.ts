/**
 * Shared validation utilities
 */

import { ValidationError } from './errors.js'
import { VALIDATION, PAGINATION, isValidRole } from './constants.js'

/**
 * Parses and validates pagination parameters
 */
export function parsePagination(
  limitStr: string | undefined,
  offsetStr: string | undefined,
  options: { maxLimit?: number; defaultLimit?: number } = {}
): { limit: number; offset: number } {
  const { maxLimit = PAGINATION.MAX_LIMIT, defaultLimit = PAGINATION.DEFAULT_LIMIT } = options

  const limit = Math.min(maxLimit, Math.max(1, parseInt(limitStr || '', 10) || defaultLimit))
  const offset = Math.max(0, parseInt(offsetStr || '', 10) || PAGINATION.DEFAULT_OFFSET)

  return { limit, offset }
}

/**
 * Validates UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Validates and parses search query
 */
export function validateSearchQuery(query: unknown): string {
  if (!query || typeof query !== 'string') {
    throw new ValidationError('Search query (q) is required')
  }

  if (query.length < VALIDATION.SEARCH_QUERY_MIN_LENGTH) {
    throw new ValidationError(
      `Search query must be at least ${VALIDATION.SEARCH_QUERY_MIN_LENGTH} characters`
    )
  }

  if (query.length > VALIDATION.SEARCH_QUERY_MAX_LENGTH) {
    throw new ValidationError(
      `Search query must be at most ${VALIDATION.SEARCH_QUERY_MAX_LENGTH} characters`
    )
  }

  return query
}

/**
 * Validates role value
 */
export function validateRole(role: unknown): 'user' | 'assistant' | 'system' {
  if (typeof role !== 'string' || !isValidRole(role)) {
    throw new ValidationError('Invalid role. Must be: user, assistant, or system')
  }
  return role
}

/**
 * Validates session name
 */
export function validateSessionName(name: unknown): string {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Session name is required')
  }

  if (name.length > VALIDATION.SESSION_NAME_MAX_LENGTH) {
    throw new ValidationError(`Session name must be at most ${VALIDATION.SESSION_NAME_MAX_LENGTH} characters`)
  }

  return name
}

/**
 * Validates required message fields
 */
export function validateMessageInput(input: {
  session_id?: unknown
  role?: unknown
  content?: unknown
}): void {
  if (!input.session_id || typeof input.session_id !== 'string') {
    throw new ValidationError('session_id is required')
  }

  if (!input.role) {
    throw new ValidationError('role is required')
  }

  validateRole(input.role)

  if (!input.content || typeof input.content !== 'string') {
    throw new ValidationError('content is required')
  }
}
