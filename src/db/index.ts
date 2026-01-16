import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type {
  Session,
  Message,
  SearchResult,
  SessionStats,
  DailyStats,
  ToolUsageStats,
  CaptureMessageInput,
  CreateSessionInput
} from '../types/index.js'

const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Test connection
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err)
})

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
  const schemaPath = join(__dirname, 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf-8')

  const client = await pool.connect()
  try {
    await client.query(schema)
    console.log('Database schema initialized successfully')
  } finally {
    client.release()
  }
}

// =============================================================================
// Session Operations
// =============================================================================

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const { name, project_path, metadata } = input

  const result = await pool.query<Session>(
    `INSERT INTO sessions (name, project_path, metadata)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, project_path || null, JSON.stringify(metadata || {})]
  )

  return result.rows[0]
}

export async function getSession(id: string): Promise<Session | null> {
  const result = await pool.query<Session>('SELECT * FROM sessions WHERE id = $1', [id])
  return result.rows[0] || null
}

export async function listSessions(
  limit: number = 50,
  offset: number = 0
): Promise<{ sessions: Session[]; total: number }> {
  const countResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM sessions'
  )
  const total = parseInt(countResult.rows[0].count, 10)

  const result = await pool.query<Session>(
    `SELECT * FROM sessions
     ORDER BY started_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  return { sessions: result.rows, total }
}

export async function endSession(id: string): Promise<Session | null> {
  const result = await pool.query<Session>(
    `UPDATE sessions
     SET ended_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  )
  return result.rows[0] || null
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM sessions WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}

// =============================================================================
// Message Operations
// =============================================================================

export async function captureMessage(input: CaptureMessageInput): Promise<Message> {
  const {
    session_id,
    role,
    content,
    thinking_content,
    thinking_text,
    thinking,
    thoughts,
    thinking_tokens,
    thinking_token_count,
    thoughts_token_count,
    model,
    input_tokens,
    output_tokens,
    tool_calls
  } = input
  const normalizeThinkingContent = (
    value: string | string[] | null | undefined
  ): string | null => {
    if (!value) return null
    return Array.isArray(value) ? value.filter(Boolean).join('\n') : value
  }
  const normalizedThinkingContent = normalizeThinkingContent(
    thinking_content ?? thinking_text ?? thinking ?? thoughts ?? null
  )
  const normalizedThinkingTokens =
    thinking_tokens ?? thinking_token_count ?? thoughts_token_count ?? 0

  const result = await pool.query<Message>(
    `INSERT INTO messages (
      session_id, role, content, thinking_content, thinking_tokens,
      model, input_tokens, output_tokens, tool_calls
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      session_id,
      role,
      content,
      normalizedThinkingContent,
      normalizedThinkingTokens,
      model || null,
      input_tokens || 0,
      output_tokens || 0,
      JSON.stringify(tool_calls || [])
    ]
  )

  return result.rows[0]
}

export async function getMessage(id: string): Promise<Message | null> {
  const result = await pool.query<Message>('SELECT * FROM messages WHERE id = $1', [id])
  return result.rows[0] || null
}

export async function getSessionMessages(
  sessionId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{ messages: Message[]; total: number }> {
  const countResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM messages WHERE session_id = $1',
    [sessionId]
  )
  const total = parseInt(countResult.rows[0].count, 10)

  const result = await pool.query<Message>(
    `SELECT * FROM messages
     WHERE session_id = $1
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [sessionId, limit, offset]
  )

  return { messages: result.rows, total }
}

// =============================================================================
// Search Operations (Full-Text Search)
// =============================================================================

export async function searchMessages(
  query: string,
  options: {
    sessionId?: string
    role?: string
    limit?: number
    offset?: number
    searchThinking?: boolean
  } = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const { sessionId, role, limit = 50, offset = 0, searchThinking = true } = options

  // Build the search query
  const conditions: string[] = ["search_vector @@ plainto_tsquery('english', $1)"]
  const params: (string | number)[] = [query]
  let paramIndex = 2

  if (sessionId) {
    conditions.push(`m.session_id = $${paramIndex}`)
    params.push(sessionId)
    paramIndex++
  }

  if (role) {
    conditions.push(`m.role = $${paramIndex}`)
    params.push(role)
    paramIndex++
  }

  const whereClause = conditions.join(' AND ')

  // Count total results
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM messages m
     JOIN sessions s ON m.session_id = s.id
     WHERE ${whereClause}`,
    params
  )
  const total = parseInt(countResult.rows[0].count, 10)

  // Get results with ranking
  params.push(limit, offset)
  const result = await pool.query<SearchResult>(
    `SELECT
       m.id,
       m.session_id,
       s.name as session_name,
       m.role,
       ts_headline('english', m.content, plainto_tsquery('english', $1),
         'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>') as content_snippet,
       ${
         searchThinking
           ? `ts_headline('english', COALESCE(m.thinking_content, ''), plainto_tsquery('english', $1),
         'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>') as thinking_snippet,`
           : 'NULL as thinking_snippet,'
       }
       m.created_at,
       ts_rank(m.search_vector, plainto_tsquery('english', $1)) as rank
     FROM messages m
     JOIN sessions s ON m.session_id = s.id
     WHERE ${whereClause}
     ORDER BY rank DESC, m.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  )

  return { results: result.rows, total }
}

// =============================================================================
// Analytics Operations
// =============================================================================

export async function getOverallStats(): Promise<SessionStats> {
  const result = await pool.query<{
    total_sessions: string
    total_messages: string
    total_thinking_tokens: string
    total_input_tokens: string
    total_output_tokens: string
    avg_thinking_tokens_per_message: string
  }>(`
    SELECT
      (SELECT COUNT(*) FROM sessions) as total_sessions,
      (SELECT COUNT(*) FROM messages) as total_messages,
      COALESCE(SUM(thinking_tokens), 0) as total_thinking_tokens,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens,
      COALESCE(AVG(thinking_tokens) FILTER (WHERE thinking_tokens > 0), 0) as avg_thinking_tokens_per_message
    FROM messages
  `)

  const row = result.rows[0]
  return {
    total_sessions: parseInt(row.total_sessions, 10),
    total_messages: parseInt(row.total_messages, 10),
    total_thinking_tokens: parseInt(row.total_thinking_tokens, 10),
    total_input_tokens: parseInt(row.total_input_tokens, 10),
    total_output_tokens: parseInt(row.total_output_tokens, 10),
    avg_thinking_tokens_per_message: parseFloat(row.avg_thinking_tokens_per_message)
  }
}

export async function getDailyStats(days: number = 30): Promise<DailyStats[]> {
  const result = await pool.query<DailyStats>(
    `SELECT * FROM daily_stats
     WHERE date >= CURRENT_DATE - $1::interval
     ORDER BY date DESC`,
    [`${days} days`]
  )
  return result.rows
}

export async function getToolUsageStats(): Promise<ToolUsageStats[]> {
  const result = await pool.query<ToolUsageStats>(`
    SELECT
      tool_call->>'name' as tool_name,
      COUNT(*) as call_count,
      AVG((tool_call->>'duration_ms')::numeric) as avg_duration_ms,
      COUNT(*) FILTER (WHERE tool_call->>'error' IS NOT NULL) as error_count
    FROM messages,
         jsonb_array_elements(tool_calls) as tool_call
    GROUP BY tool_call->>'name'
    ORDER BY call_count DESC
  `)
  return result.rows
}

export async function getSessionStats(sessionId: string): Promise<{
  message_count: number
  thinking_tokens: number
  input_tokens: number
  output_tokens: number
  tool_calls: number
  duration_minutes: number
} | null> {
  const result = await pool.query<{
    message_count: string
    thinking_tokens: string
    input_tokens: string
    output_tokens: string
    tool_calls: string
    duration_minutes: string
  }>(
    `
    SELECT
      COUNT(*) as message_count,
      COALESCE(SUM(thinking_tokens), 0) as thinking_tokens,
      COALESCE(SUM(input_tokens), 0) as input_tokens,
      COALESCE(SUM(output_tokens), 0) as output_tokens,
      COALESCE(SUM(jsonb_array_length(tool_calls)), 0) as tool_calls,
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as duration_minutes
    FROM messages
    WHERE session_id = $1
  `,
    [sessionId]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    message_count: parseInt(row.message_count, 10),
    thinking_tokens: parseInt(row.thinking_tokens, 10),
    input_tokens: parseInt(row.input_tokens, 10),
    output_tokens: parseInt(row.output_tokens, 10),
    tool_calls: parseInt(row.tool_calls, 10),
    duration_minutes: parseFloat(row.duration_minutes) || 0
  }
}

// Export pool for raw queries if needed
export { pool }
