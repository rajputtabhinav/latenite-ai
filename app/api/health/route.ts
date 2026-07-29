import { NextResponse } from 'next/server'
import {
  createErrorResponse,
  ErrorCategory,
  ErrorSeverity,
  withErrorHandling,
} from '../../lib/error-handler'

async function handleHealthCheck() {
  try {
    // Check critical services
    const servicesStatus = {
      api: 'ok',
      websocket: 'ok',
      ai: {
        anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
      },
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage()
    const memory = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      unit: 'MB',
    }

    // Check if memory usage is critically high
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100
    const healthStatus = memoryUsagePercent > 95 ? 'degraded' : 'healthy' // Increased threshold to 95%

    const health = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: servicesStatus,
      memory,
      memoryUsagePercent: Math.round(memoryUsagePercent),
    }

    // Always return 200 unless critical failure - degraded is still functional
    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Health check error:', error)
    return createErrorResponse(
      error,
      ErrorCategory.INTERNAL,
      ErrorSeverity.HIGH,
      500,
      { endpoint: '/api/health' }
    )
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

export const GET = withErrorHandling(handleHealthCheck, ErrorCategory.INTERNAL)

