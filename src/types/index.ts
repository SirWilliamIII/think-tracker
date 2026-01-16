export interface Session {
  id: string
  name: string
  project_path?: string
  started_at: Date
  ended_at?: Date
  metadata?: Record<string, unknown>
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking_content?: string
  thinking_tokens?: number
  model?: string
  input_tokens?: number
  output_tokens?: number
  tool_calls?: ToolCall[]
  created_at: Date
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  output?: string
  error?: string
  duration_ms?: number
}

export interface ThinkingBlock {
  id: string
  message_id: string
  content: string
  token_count?: number
  created_at: Date
}

export interface SearchResult {
  id: string
  session_id: string
  session_name: string
  role: string
  content_snippet: string
  thinking_snippet?: string
  created_at: Date
  rank: number
}

export interface SessionStats {
  total_sessions: number
  total_messages: number
  total_thinking_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  avg_thinking_tokens_per_message: number
}

export interface DailyStats {
  date: string
  sessions: number
  messages: number
  thinking_tokens: number
}

export interface ToolUsageStats {
  tool_name: string
  call_count: number
  avg_duration_ms: number
  error_count: number
}

// MCP-specific types
export interface CaptureMessageInput {
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking_content?: string
  thinking_tokens?: number
  model?: string
  input_tokens?: number
  output_tokens?: number
  tool_calls?: ToolCall[]
}

export interface CreateSessionInput {
  name: string
  project_path?: string
  metadata?: Record<string, unknown>
}

export type SearchOptions = {
  query: string
  session_id?: string
  role?: 'user' | 'assistant' | 'system'
  limit: number
  offset: number
  search_thinking: boolean
}
