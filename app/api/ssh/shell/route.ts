import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'ssh2'
import { 
  getSession, 
  updateSessionActivity, 
  checkSessionHealth,
  cleanupSession
} from '../../../lib/ssh-session-manager'
import {
  createErrorResponse,
  validationError,
  sshConnectionError,
  ErrorCategory,
  ErrorSeverity,
  withErrorHandling,
  errorLogger,
} from '../../../lib/error-handler'

// Create an interactive shell session
async function createInteractiveShell(sessionId: string): Promise<any> {
  const session = getSession(sessionId)
  if (!session?.connection || !session.connected) {
    throw {
      success: false,
      message: 'SSH session not found or connection lost. Please reconnect.',
      needsReconnect: true
    }
  }

  // FIXED: Don't cleanup session during active shell operations
  // Just verify session exists
  if (!session || !session.connection) {
    throw {
      success: false,
      message: 'SSH connection is no longer active. Please reconnect.',
      needsReconnect: true
    }
  }

  return new Promise((resolve, reject) => {
    updateSessionActivity(sessionId)
    
    // Create interactive shell with proper terminal settings
    session.connection.shell({
      term: 'xterm-256color',
      cols: 80,
      rows: 24
    }, (err: any, stream: any) => {
      if (err) {
        console.error(`❌ Interactive shell error: ${err.message}`)
        reject({
          success: false,
          message: `Failed to create interactive shell: ${err.message}`,
          error: err.message
        })
        return
      }

      let output = ''
      let isReady = false

      // Handle shell output
      stream.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8')
        output += chunk
        
        // Detect when shell is ready (look for prompt)
        if (!isReady && (chunk.includes('$') || chunk.includes('#') || chunk.includes('>'))) {
          isReady = true
          
          // Send initial commands to improve terminal behavior
          const initCommands = [
            'stty sane',
            'export TERM=xterm-256color',
            'stty erase ^?',
            'PS1="\\u@\\h:\\w\\$ "'  // Set a consistent prompt
          ].join('\n') + '\n'
          
          stream.write(initCommands)
          
          // Give some time for commands to execute
          setTimeout(() => {
            resolve({
              success: true,
              sessionId,
              shellReady: true,
              output: output.trim(),
              message: 'Interactive shell session created'
            })
          }, 1000)
        }
      })

      stream.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8')
        output += chunk
        console.log(`📤 Shell stderr: ${chunk}`)
      })

      stream.on('close', () => {
        console.log('Interactive shell closed')
        if (!isReady) {
          reject({
            success: false,
            message: 'Shell session closed unexpectedly'
          })
        }
      })

      stream.on('error', (streamError: any) => {
        console.error(`❌ Shell stream error: ${streamError.message}`)
        reject({
          success: false,
          message: `Shell stream error: ${streamError.message}`,
          error: streamError.message
        })
      })

      // Timeout if shell doesn't become ready
      setTimeout(() => {
        if (!isReady) {
          reject({
            success: false,
            message: 'Shell initialization timeout'
          })
        }
      }, 15000)
    })
  })
}

async function handleShellPost(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, action } = body

    // Validate inputs
    if (!sessionId) {
      return validationError('Session ID is required')
    }

    if (!action) {
      return validationError('Action is required', {
        validActions: ['create'],
      })
    }

    if (action === 'create') {
      try {
        errorLogger.log({
          category: ErrorCategory.SSH_CONNECTION,
          severity: ErrorSeverity.LOW,
          message: `Creating interactive shell for session: ${sessionId}`,
        })

        const result = await createInteractiveShell(sessionId)

        errorLogger.log({
          category: ErrorCategory.SSH_CONNECTION,
          severity: ErrorSeverity.LOW,
          message: `Interactive shell created successfully for session: ${sessionId}`,
        })

        return NextResponse.json(result)
      } catch (error: any) {
        console.error('Interactive shell creation failed:', error)

        if (error.needsReconnect) {
          return sshConnectionError(error.message, {
            sessionId,
            needsReconnect: true,
            suggestion: 'Please reconnect to SSH server',
          })
        }

        return sshConnectionError(
          error.message || 'Failed to create interactive shell',
          {
            sessionId,
            error: error.error,
          }
        )
      }
    }

    return validationError(`Invalid action: ${action}`, {
      validActions: ['create'],
      receivedAction: action,
    })
  } catch (error) {
    console.error('SSH Shell API error:', error)
    return createErrorResponse(
      error,
      ErrorCategory.SSH_CONNECTION,
      ErrorSeverity.HIGH,
      500,
      { endpoint: '/api/ssh/shell' }
    )
  }
}

export const POST = withErrorHandling(handleShellPost, ErrorCategory.SSH_CONNECTION)

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SSH Interactive Shell endpoint ready",
    status: "operational",
    features: [
      "Interactive shell sessions",
      "Proper terminal initialization", 
      "Bash environment setup",
      "Terminal key handling support",
      "Real-time shell interaction"
    ]
  })
}