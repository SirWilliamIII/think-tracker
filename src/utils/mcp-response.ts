/**
 * MCP response formatting utilities
 * Eliminates duplication in MCP tool handlers
 */

import { formatErrorMessage } from './errors.js'

type McpTextContent = { type: 'text'; text: string }
type McpResponse = { content: McpTextContent[]; isError?: boolean }

/**
 * Creates a successful MCP response with JSON data
 */
export function mcpSuccess<T>(data: T): McpResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
  }
}

/**
 * Creates an error MCP response
 */
export function mcpError(error: unknown): McpResponse {
  return {
    content: [{ type: 'text', text: `Error: ${formatErrorMessage(error)}` }],
    isError: true
  }
}

/**
 * Creates a not found MCP response
 */
export function mcpNotFound(resource: string): McpResponse {
  return {
    content: [{ type: 'text', text: `${resource} not found` }],
    isError: true
  }
}

/**
 * Wraps an async MCP handler with standard error handling
 */
export function withMcpErrorHandling<T, R>(
  handler: (params: T) => Promise<R>
): (params: T) => Promise<McpResponse> {
  return async (params: T) => {
    try {
      const result = await handler(params)
      return mcpSuccess(result)
    } catch (error) {
      return mcpError(error)
    }
  }
}
