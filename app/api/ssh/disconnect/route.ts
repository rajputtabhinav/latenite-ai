import { NextRequest, NextResponse } from 'next/server'
import { 
  getSession, 
  cleanupSession, 
  getAllSessions 
} from '../../../lib/ssh-session-manager'
import {
  createErrorResponse,
  validationError,
  notFoundError,
  sshConnectionError,
  ErrorCategory,
  ErrorSeverity,
  withErrorHandling,
  errorLogger,
} from '../../../lib/error-handler'

async function handleDisconnectPost(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    // Validate input
    if (!sessionId) {
      return validationError('Session ID is required for disconnection')
    }

    console.log(`🔄 SSH disconnect request for session: ${sessionId}`)

    // Get session
    const session = getSession(sessionId)
    if (!session) {
      errorLogger.log({
        category: ErrorCategory.SSH_CONNECTION,
        severity: ErrorSeverity.LOW,
        message: `Disconnect attempt for non-existent session: ${sessionId}`,
      })

      return notFoundError(`SSH session: ${sessionId}`)
    }

    const wasConnected = session.connected
    const host = session.host
    const username = session.username

    // Clean up the session
    const cleaned = cleanupSession(sessionId)

    if (cleaned) {
      errorLogger.log({
        category: ErrorCategory.SSH_CONNECTION,
        severity: ErrorSeverity.LOW,
        message: `SSH connection closed: ${username}@${host}`,
        details: { sessionId, host, username, wasConnected },
      })

      return NextResponse.json({
        success: true,
        message: `🔌 SSH connection closed: ${username}@${host}`,
        sessionId,
        host,
        username,
        wasConnected,
        timestamp: new Date().toISOString(),
      })
    } else {
      return sshConnectionError('Failed to disconnect SSH session', {
        sessionId,
        host,
        username,
      })
    }
  } catch (error) {
    console.error('SSH disconnect error:', error)
    return createErrorResponse(
      error,
      ErrorCategory.SSH_CONNECTION,
      ErrorSeverity.HIGH,
      500,
      { endpoint: '/api/ssh/disconnect' }
    )
  }
}

export const POST = withErrorHandling(handleDisconnectPost, ErrorCategory.SSH_CONNECTION)

export async function GET() {
  const allSessions = getAllSessions()
  const sessionData = allSessions.map(({ sessionId, session }) => ({
    sessionId,
    host: session.host,
    username: session.username,
    connected: session.connected,
    lastActivity: session.lastActivity,
    createdAt: session.createdAt || session.lastActivity
  }))
  
  return NextResponse.json({
    success: true,
    message: "SSH disconnect endpoint ready",
    status: "operational",
    features: [
      "Clean session termination",
      "Connection cleanup",
      "Session state management",
      "Secure connection handling"
    ],
    statistics: {
      activeSessions: allSessions.length,
      activeConnections: allSessions.length
    },
    sessions: sessionData // For debugging - remove in production
  })
} 