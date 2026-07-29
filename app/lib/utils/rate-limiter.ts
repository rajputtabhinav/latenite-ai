/**
 * Rate Limiter Utility
 * Simple in-memory rate limiting for API routes
 * For production, consider using Redis-based rate limiting
 */

export interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Maximum requests per window
  message?: string  // Custom error message
  skipSuccessfulRequests?: boolean  // Don't count successful requests
}

interface RateLimitRecord {
  count: number
  resetTime: number
}

class RateLimiter {
  private static instance: RateLimiter
  private records: Map<string, RateLimitRecord> = new Map()
  private cleanupInterval: NodeJS.Timeout

  private constructor() {
    // Cleanup expired records every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  static getInstance(): RateLimiter {
    if (!this.instance) {
      this.instance = new RateLimiter()
    }
    return this.instance
  }

  /**
   * Check if request is rate limited
   * Returns null if allowed, error object if limited
   */
  check(
    key: string,
    config: RateLimitConfig
  ): { limited: boolean; remaining: number; resetTime: number; error?: string } {
    const now = Date.now()
    const record = this.records.get(key)

    // No record or expired - allow and create new record
    if (!record || now >= record.resetTime) {
      this.records.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })

      return {
        limited: false,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      }
    }

    // Increment count
    record.count++

    // Check if limit exceeded
    if (record.count > config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)
      
      return {
        limited: true,
        remaining: 0,
        resetTime: record.resetTime,
        error: config.message || `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      }
    }

    // Update record
    this.records.set(key, record)

    return {
      limited: false,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.records.delete(key)
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetTime) {
        this.records.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Rate limiter cleaned up ${cleaned} expired records`)
    }
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { totalRecords: number; activeRecords: number } {
    const now = Date.now()
    let active = 0

    for (const record of this.records.values()) {
      if (now < record.resetTime) {
        active++
      }
    }

    return {
      totalRecords: this.records.size,
      activeRecords: active
    }
  }
}

export const rateLimiter = RateLimiter.getInstance()

/**
 * Rate limit configurations for different API routes
 */
export const RATE_LIMITS = {
  // SSH routes - strict limits (these can be abused for scanning/attacks)
  SSH_CONNECT: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 5,  // 5 connection attempts per minute
    message: 'Too many SSH connection attempts. Please wait before trying again.'
  },
  
  SSH_COMMAND: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 120,  // 120 commands per minute (2 per second)
    message: 'Too many commands. Please slow down.'
  },

  // AI routes - moderate limits (AI inference is expensive)
  AI_CHAT: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 30,  // 30 AI requests per minute
    message: 'Too many AI requests. Please wait before sending more messages.'
  },

  AI_STREAM: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 30,  // 30 streaming requests per minute
    message: 'Too many streaming requests. Please wait before starting new conversations.'
  },

  // MCP routes - moderate limits
  MCP_TOOL: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 60,  // 60 MCP tool calls per minute
    message: 'Too many MCP requests. Please slow down.'
  },

  // General API - lenient limits
  GENERAL: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 100,  // 100 requests per minute
    message: 'Too many requests. Please slow down.'
  }
} as const

/**
 * Helper function to get client identifier from request
 * Uses IP address or a header-based identifier
 */
export function getClientIdentifier(request: Request): string {
  // Try to get forwarded IP first (for reverse proxies)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // Try real IP header
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // For development, use a fallback
  return 'dev-client'
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  config: RateLimitConfig
) {
  return async (req: Request): Promise<Response> => {
    const clientId = getClientIdentifier(req)
    const result = rateLimiter.check(clientId, config)

    if (result.limited) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
      
      return new Response(JSON.stringify({
        error: result.error,
        retryAfter
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        }
      })
    }

    // Add rate limit headers to response
    const response = await handler(req)
    
    // Clone response to add headers
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    newResponse.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

    return newResponse
  }
}
