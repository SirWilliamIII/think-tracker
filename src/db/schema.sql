CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    project_path TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table with thinking data
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    thinking_content TEXT,
    thinking_tokens INTEGER DEFAULT 0,
    model VARCHAR(100),
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    tool_calls JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Full-text search vector
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(content, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(thinking_content, '')), 'B')
    ) STORED
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_name ON sessions(name);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING GIN(search_vector);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for sessions updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for session statistics
CREATE OR REPLACE VIEW session_stats AS
SELECT
    s.id,
    s.name,
    s.project_path,
    s.started_at,
    s.ended_at,
    COUNT(m.id) as message_count,
    SUM(COALESCE(m.thinking_tokens, 0)) as total_thinking_tokens,
    SUM(COALESCE(m.input_tokens, 0)) as total_input_tokens,
    SUM(COALESCE(m.output_tokens, 0)) as total_output_tokens,
    COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
    COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_messages
FROM sessions s
LEFT JOIN messages m ON s.id = m.session_id
GROUP BY s.id, s.name, s.project_path, s.started_at, s.ended_at;

-- View for daily statistics
CREATE OR REPLACE VIEW daily_stats AS
SELECT
    DATE(created_at) as date,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as messages,
    SUM(COALESCE(thinking_tokens, 0)) as thinking_tokens,
    SUM(COALESCE(input_tokens, 0)) as input_tokens,
    SUM(COALESCE(output_tokens, 0)) as output_tokens
FROM messages
GROUP BY DATE(created_at)
ORDER BY date DESC;
