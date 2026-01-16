import { initializeDatabase } from './index.js'

async function main() {
  try {
    console.log('Initializing database...')
    await initializeDatabase()
    console.log('Database initialization complete!')
    process.exit(0)
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

main()
