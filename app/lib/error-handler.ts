/**
 * Centralized Error Handling and Logging Utility
 * 
 * This module provides:
 * - Standardized error responses
 * - Comprehensive error logging
 * - Error categorization and tracking
 * - Production-ready error monitoring
 */

import { NextResponse } from 'next/server'

// Error categories for better monitoring and analytics
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  FILE_SYSTEM = 'FILE_SYSTEM',
  SSH_CONNECTION = 'SSH_CONNECTION',
  WEBSOCKET = 'WEBSOCKET',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Standardized error interface
export interface AppError {
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  code?: string
  details?: any
  stack?: string
  timestamp: string
  requestId?: string
  userId?: string
  path?: string
}

// Error log storage (in-memory for now, can be replaced with database)
class ErrorLogger {
  private static instance: ErrorLogger
  private errorLog: AppError[] = []
  private maxLogSize = 1000 // Keep last 1000 errors in memory

  private constructor() {
    // Initialize error logger
    this.setupPeriodicCleanup()
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  /**
   * Log an error to the centralized error tracking system
   */
  log(error: Partial<AppError>): void {
    const fullError: AppError = {
      category: error.category || ErrorCategory.INTERNAL,
      severity: error.severity || ErrorSeverity.MEDIUM,
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      requestId: error.requestId,
      userId: error.userId,
      path: error.path,
    }

    // Add to in-memory log
    this.errorLog.push(fullError)

    // Keep log size under control
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift()
    }

    // Log to console with appropriate level
    this.logToConsole(fullError)

    // TODO: Send to external monitoring service (e.g., Sentry, DataDog, CloudWatch)
    // this.sendToMonitoring(fullError)
  }

  /**
   * Get recent errors (for admin dashboard)
   */
  getRecentErrors(limit: number = 100): AppError[] {
    return this.errorLog.slice(-limit)
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errorLog.filter((error) => error.category === category)
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorLog.filter((error) => error.severity === severity)
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number
    byCategory: Record<string, number>
    bySeverity: Record<string, number>
    recentErrors: AppError[]
  } {
    const stats = {
      total: this.errorLog.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recentErrors: this.getRecentErrors(10),
    }

    // Count by category
    this.errorLog.forEach((error) => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1
    })

    return stats
  }

  /**
   * Clear old errors periodically to prevent memory issues
   */
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      this.errorLog = this.errorLog.filter((error) => error.timestamp > oneDayAgo)
    }, 60 * 60 * 1000) // Run cleanup every hour
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(error: AppError): void {
    const emoji = this.getSeverityEmoji(error.severity)
    const prefix = `${emoji} [${error.category}]`

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(prefix, error.message, error)
        break
      case ErrorSeverity.HIGH:
        console.error(prefix, error.message, error)
        break
      case ErrorSeverity.MEDIUM:
        console.warn(prefix, error.message, error)
        break
      case ErrorSeverity.LOW:
        console.log(prefix, error.message)
        break
    }
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return '🔴'
      case ErrorSeverity.HIGH:
        return '🟠'
      case ErrorSeverity.MEDIUM:
        return '🟡'
      case ErrorSeverity.LOW:
        return '🟢'
      default:
        return '⚪'
    }
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance()

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | any,
  category: ErrorCategory,
  severity: ErrorSeverity,
  statusCode: number = 500,
  additionalContext?: any
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  // Log the error
  errorLogger.log({
    category,
    severity,
    message: errorMessage,
    details: additionalContext,
    stack: errorStack,
  })

  // Determine if we should expose the full error message
  const isProduction = process.env.NODE_ENV === 'production'
  const shouldHideDetails = isProduction && severity === ErrorSeverity.CRITICAL

  // Create response
  const responseBody: any = {
    success: false,
    error: shouldHideDetails ? 'An internal error occurred' : errorMessage,
    category,
    timestamp: new Date().toISOString(),
  }

  // Add details in development mode
  if (!isProduction && additionalContext) {
    responseBody.details = additionalContext
  }

  return NextResponse.json(responseBody, { status: statusCode })
}

/**
 * Wrap an async handler with error handling
 */
export function withErrorHandling(
  handler: (request: any, context?: any) => Promise<NextResponse>,
  category: ErrorCategory = ErrorCategory.INTERNAL
) {
  return async (request: any, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('Unhandled error in API route:', error)
      return createErrorResponse(
        error,
        category,
        ErrorSeverity.HIGH,
        500,
        {
          path: request.url,
          method: request.method,
        }
      )
    }
  }
}

/**
 * Validation error helper
 */
export function validationError(message: string, details?: any): NextResponse {
  return createErrorResponse(
    new Error(message),
    ErrorCategory.VALIDATION,
    ErrorSeverity.LOW,
    400,
    details
  )
}

/**
 * Authentication error helper
 */
export function authenticationError(message: string = 'Authentication required'): NextResponse {
  return createErrorResponse(
    new Error(message),
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.MEDIUM,
    401
  )
}

/**
 * Authorization error helper
 */
export function authorizationError(message: string = 'Insufficient permissions'): NextResponse {
  return createErrorResponse(
    new Error(message),
    ErrorCategory.AUTHORIZATION,
    ErrorSeverity.MEDIUM,
    403
  )
}

/**
 * Not found error helper
 */
export function notFoundError(resource: string): NextResponse {
  return createErrorResponse(
    new Error(`${resource} not found`),
    ErrorCategory.NOT_FOUND,
    ErrorSeverity.LOW,
    404
  )
}

/**
 * Rate limit error helper
 */
export function rateLimitError(message: string = 'Too many requests'): NextResponse {
  return createErrorResponse(
    new Error(message),
    ErrorCategory.RATE_LIMIT,
    ErrorSeverity.MEDIUM,
    429
  )
}

/**
 * Timeout error helper
 */
export function timeoutError(message: string = 'Request timeout'): NextResponse {
  return createErrorResponse(
    new Error(message),
    ErrorCategory.TIMEOUT,
    ErrorSeverity.MEDIUM,
    504
  )
}

/**
 * SSH connection error helper
 */
export function sshConnectionError(message: string, details?: any): NextResponse {
  return createErrorResponse(
    new Error(message),
    ErrorCategory.SSH_CONNECTION,
    ErrorSeverity.HIGH,
    500,
    details
  )
}

/**
 * External API error helper
 */
export function externalApiError(service: string, error: any): NextResponse {
  return createErrorResponse(
    error,
    ErrorCategory.EXTERNAL_API,
    ErrorSeverity.HIGH,
    502,
    { service }
  )
}

// Export error statistics endpoint helper
export function getErrorStatistics(): {
  total: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  recentErrors: AppError[]
} {
  return errorLogger.getStatistics()
}

