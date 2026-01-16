/**
 * Application-wide constants to avoid magic numbers/strings
 */

export const VALIDATION = {
  SESSION_NAME_MAX_LENGTH: 255,
  SEARCH_QUERY_MIN_LENGTH: 2,
  SEARCH_QUERY_MAX_LENGTH: 500,
  MAX_DAILY_STATS_DAYS: 365
} as const

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  MESSAGES_DEFAULT_LIMIT: 100,
  MESSAGES_MAX_LIMIT: 500,
  DEFAULT_OFFSET: 0
} as const

export const ROLES = ['user', 'assistant', 'system'] as const
export type Role = (typeof ROLES)[number]

export function isValidRole(role: string): role is Role {
  return ROLES.includes(role as Role)
}
