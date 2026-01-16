import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import sessionRoutes from './routes/sessions.js'
import messageRoutes from './routes/messages.js'
import searchRoutes from './routes/search.js'
import analyticsRoutes from './routes/analytics.js'
import { initializeDatabase } from './db/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve static files
app.use(express.static(join(__dirname, '../public')))

// API Routes
app.use('/api/sessions', sessionRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/analytics', analyticsRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Catch-all for SPA routing - serve index.html
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'))
})

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
)

// Start server
async function main() {
  try {
    // Initialize database on startup
    console.log('Initializing database...')
    await initializeDatabase()
    console.log('Database initialized')

    app.listen(PORT, () => {
      console.log(`Claude Think Tracker server running at http://localhost:${PORT}`)
      console.log(`API endpoints:`)
      console.log(`  - GET  /api/sessions          - List sessions`)
      console.log(`  - POST /api/sessions          - Create session`)
      console.log(`  - GET  /api/sessions/:id      - Get session`)
      console.log(`  - GET  /api/sessions/:id/messages - Get session messages`)
      console.log(`  - GET  /api/search?q=...      - Search messages`)
      console.log(`  - GET  /api/analytics/overview - Get statistics`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

main()
