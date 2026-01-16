import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  createSession,
  endSession,
  captureMessage,
  getSession,
  listSessions,
  getSessionMessages,
  searchMessages,
  getOverallStats,
  getSessionStats
} from './db/index.js'

const CreateSessionSchema = z
  .object({
    name: z.string().min(1).max(255).describe('Name for this coding session'),
    project_path: z.string().optional().describe('Path to the project directory'),
    metadata: z.record(z.unknown()).optional().describe('Additional metadata')
  })
  .strict()

const EndSessionSchema = z
  .object({
    session_id: z.string().uuid().describe('UUID of the session to end')
  })
  .strict()

const CaptureMessageSchema = z
  .object({
    session_id: z.string().uuid().describe('UUID of the session'),
    role: z
      .enum(['user', 'assistant', 'system'])
      .describe('Role of the message sender'),
    content: z.string().describe('The message content'),
    thinking_content: z.string().optional().describe('Extended thinking content'),
    thinking_tokens: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Tokens used in thinking'),
    model: z.string().optional().describe('Model used'),
    input_tokens: z.number().int().min(0).optional().describe('Input tokens'),
    output_tokens: z.number().int().min(0).optional().describe('Output tokens'),
    tool_calls: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          input: z.record(z.unknown()),
          output: z.string().optional(),
          error: z.string().optional(),
          duration_ms: z.number().optional()
        })
      )
      .optional()
      .describe('Tool calls made')
  })
  .strict()

const GetSessionSchema = z
  .object({
    session_id: z.string().uuid().describe('UUID of the session')
  })
  .strict()

const ListSessionsSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0)
  })
  .strict()

const GetMessagesSchema = z
  .object({
    session_id: z.string().uuid().describe('UUID of the session'),
    limit: z.number().int().min(1).max(500).default(100),
    offset: z.number().int().min(0).default(0)
  })
  .strict()

const SearchSchema = z
  .object({
    query: z.string().min(2).max(500).describe('Search query'),
    session_id: z.string().uuid().optional(),
    role: z.enum(['user', 'assistant', 'system']).optional(),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
    search_thinking: z.boolean().default(true)
  })
  .strict()

const GetStatsSchema = z
  .object({
    session_id: z.string().uuid().optional()
  })
  .strict()

const server = new McpServer({ name: 'claude-think-tracker', version: '1.0.0' })

server.registerTool(
  'tracker_create_session',
  {
    title: 'Create Tracking Session',
    description: 'Create a new session to track Claude Code interactions.',
    inputSchema: CreateSessionSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params: z.infer<typeof CreateSessionSchema>) => {
    try {
      const session = await createSession(params)
      return {
        content: [
          { type: 'text', text: JSON.stringify({ success: true, session }, null, 2) }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }
)

server.registerTool(
  'tracker_end_session',
  {
    title: 'End Tracking Session',
    description: 'Mark a tracking session as ended.',
    inputSchema: EndSessionSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: z.infer<typeof EndSessionSchema>) => {
    try {
      const session = await endSession(params.session_id)
      if (!session)
        return { content: [{ type: 'text', text: 'Session not found' }], isError: true }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { success: true, session_id: session.id, ended_at: session.ended_at },
              null,
              2
            )
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }
)

server.registerTool(
  'tracker_capture_message',
  {
    title: 'Capture Message',
    description: 'Capture a message with optional thinking data.',
    inputSchema: CaptureMessageSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params: z.infer<typeof CaptureMessageSchema>) => {
    try {
      const message = await captureMessage(params)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message_id: message.id,
                thinking_tokens: message.thinking_tokens
              },
              null,
              2
            )
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }
)

server.registerTool(
  'tracker_get_session',
  {
    title: 'Get Session',
    description: 'Retrieve details of a specific tracking session.',
    inputSchema: GetSessionSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: z.infer<typeof GetSessionSchema>) => {
    try {
      const session = await getSession(params.session_id)
      if (!session)
        return { content: [{ type: 'text', text: 'Session not found' }], isError: true }
      return { content: [{ type: 'text', text: JSON.stringify(session, null, 2) }] }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }
)

server.registerTool(
  'tracker_list_sessions',
  {
    title: 'List Sessions',
    description: 'List all tracking sessions with pagination.',
    inputSchema: ListSessionsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: z.infer<typeof ListSessionsSchema>) => {
    try {
      const result = await listSessions(params.limit, params.offset)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...result,
                has_more: result.total > params.offset + result.sessions.length
              },
              null,
              2
            )
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }
)

server.registerTool(
  'tracker_get_messages',
  {
    title: 'Get Session Messages',
    description: 'Retrieve messages from a tracking session.',
    inputSchema: GetMessagesSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: z.infer<typeof GetMessagesSchema>) => {
    try {
      const result = await getSessionMessages(
        params.session_id,
        params.limit,
        params.offset
      )
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...result,
                has_more: result.total > params.offset + result.messages.length
              },
              null,
              2
            )
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }
)

server.registerTool(
  'tracker_search',
  {
    title: 'Search Messages',
    description: 'Full-text search across all messages and thinking content.',
    inputSchema: SearchSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: z.infer<typeof SearchSchema>) => {
    try {
      const result = await searchMessages(params.query, {
        sessionId: params.session_id,
        role: params.role,
        limit: params.limit,
        offset: params.offset,
        searchThinking: params.search_thinking
      })
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query: params.query,
                ...result,
                has_more: result.total > params.offset + result.results.length
              },
              null,
              2
            )
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }
)

server.registerTool(
  'tracker_stats',
  {
    title: 'Get Statistics',
    description: 'Get usage statistics for all sessions or a specific session.',
    inputSchema: GetStatsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: z.infer<typeof GetStatsSchema>) => {
    try {
      if (params.session_id) {
        const stats = await getSessionStats(params.session_id)
        if (!stats)
          return {
            content: [{ type: 'text', text: 'Session not found' }],
            isError: true
          }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ session_id: params.session_id, ...stats }, null, 2)
            }
          ]
        }
      } else {
        const stats = await getOverallStats()
        return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] }
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Claude Think Tracker MCP server running via stdio')
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
