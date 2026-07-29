// Environment Validation - Fail fast if required variables missing

import { logger } from '../utils/logger'

export interface EnvironmentConfig {
  anthropicApiKey: string
  openaiApiKey?: string
  qdrantUrl?: string
  port: number
  nodeEnv: string
}

export function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = []
  const warnings: string[] = []

  // Required variables
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
  if (!anthropicApiKey) {
    errors.push('ANTHROPIC_API_KEY is required for Claude Sonnet 4.5')
  }

  // Optional but recommended
  const openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
  if (!openaiApiKey) {
    warnings.push('OPENAI_API_KEY not set - semantic search (embeddings) will not work')
  }

  // Optional  
  const qdrantUrl = process.env.NEXT_PUBLIC_QDRANT_URL || 'http://localhost:6333'
  const port = parseInt(process.env.PORT || '5000')
  const nodeEnv = process.env.NODE_ENV || 'development'

  // Throw if any required variables missing
  if (errors.length > 0) {
    const errorMessage = `
╔════════════════════════════════════════════════════════════╗
║  ❌ ENVIRONMENT CONFIGURATION ERROR                       ║
╚════════════════════════════════════════════════════════════╝

Missing required environment variables:
${errors.map(e => `  • ${e}`).join('\n')}

Please create a .env file in your project root with:

ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

Get your API key from: https://console.anthropic.com/settings/keys

════════════════════════════════════════════════════════════
`
    console.error(errorMessage)
    throw new Error('Missing required environment variables')
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment warnings:')
    warnings.forEach(w => logger.warn(`  • ${w}`))
  }

  // Log success
  logger.info('✅ Environment validation passed')
  logger.debug(`   • Anthropic API Key: ${anthropicApiKey ? 'Set ✓' : 'Missing ✗'}`)
  logger.debug(`   • OpenAI API Key: ${openaiApiKey ? 'Set ✓' : 'Not set (optional)'}`)
  logger.debug(`   • Qdrant URL: ${qdrantUrl}`)
  logger.debug(`   • Port: ${port}`)
  logger.debug(`   • Environment: ${nodeEnv}`)

  return {
    anthropicApiKey: anthropicApiKey!,
    openaiApiKey,
    qdrantUrl,
    port,
    nodeEnv
  }
}

export function checkOptionalFeatures(): {
  semanticSearch: boolean
  vectorDatabase: boolean
  persistentMemory: boolean
} {
  const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY)
  const hasQdrant = !!(process.env.NEXT_PUBLIC_QDRANT_URL) || true  // Defaults to localhost
  
  return {
    semanticSearch: hasOpenAI,
    vectorDatabase: hasQdrant,
    persistentMemory: typeof window !== 'undefined' && 'indexedDB' in window
  }
}

export default validateEnvironment

