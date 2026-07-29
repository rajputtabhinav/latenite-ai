// Shared SSH Session Management
// This module provides centralized session management for all SSH routes

import type { SSHSession } from '../types'

// Enhanced session storage that persists across Next.js worker restarts
declare global {
  var __SSH_SESSIONS: Map<string, SSHSession> | undefined
  var __SSH_TIMEOUTS: Map<string, NodeJS.Timeout> | undefined
}

// Use globalThis to survive module hot-reloads and worker process changes
const activeSessions = globalThis.__SSH_SESSIONS ?? (globalThis.__SSH_SESSIONS = new Map<string, SSHSession>())
const connectionTimeouts = globalThis.__SSH_TIMEOUTS ?? (globalThis.__SSH_TIMEOUTS = new Map<string, NodeJS.Timeout>())

// Enhanced session cleanup function
export const cleanupSession = (sessionId: string): boolean => {
  const session = activeSessions.get(sessionId)
  if (session?.connection) {
    try {
      // Clear all keep-alive intervals
      if (session.keepAlive) {
        clearInterval(session.keepAlive)
      }
      
      if (session.serverAliveInterval) {
        clearInterval(session.serverAliveInterval)
      }
      
      // Gracefully close the connection
      session.connection.end()
      console.log(`🔌 SSH connection closed for session: ${sessionId}`)
    } catch (error) {
      console.error('Error closing SSH connection:', error)
      
      // Force destroy if graceful close fails
      try {
        session.connection.destroy()
      } catch (destroyError) {
        console.error('Error destroying SSH connection:', destroyError)
      }
    }
  }

  activeSessions.delete(sessionId)

  const timeout = connectionTimeouts.get(sessionId)
  if (timeout) {
    clearTimeout(timeout)
    connectionTimeouts.delete(sessionId)
  }

  return true
}

// Get session
export const getSession = (sessionId: string): SSHSession | undefined => {
  return activeSessions.get(sessionId)
}

// Enhanced session storage with robust keep-alive based on web research
export const storeSession = (sessionId: string, session: SSHSession): void => {
  // Multi-layered keep-alive system to prevent broken pipe errors
  if (session.connection) {
    let keepAliveFailCount = 0
    const maxKeepAliveFailures = 3
    
    const keepAlive = setInterval(() => {
      try {
        // Use lightweight null packet keep-alive (inspired by web research)
        session.connection!.exec(':', { pty: false }, (err: any, stream: any) => {
          if (err) {
            keepAliveFailCount++
            console.log(`Keep-alive failed for ${sessionId} (${keepAliveFailCount}/${maxKeepAliveFailures}):`, err.message)
            
            if (keepAliveFailCount >= maxKeepAliveFailures) {
              console.log(`Max keep-alive failures reached for ${sessionId}, cleaning up...`)
              cleanupSession(sessionId)
            }
            return
          }
          
          // Reset failure count on success
          keepAliveFailCount = 0
          
          stream.on('close', (code: number) => {
            if (code === 0) {
              console.log(`Keep-alive successful for ${sessionId}`)
            }
          })
          
          stream.on('data', () => {
            // Consume any output
          })
          
          stream.on('error', (streamErr: any) => {
            keepAliveFailCount++
            console.log(`Keep-alive stream error for ${sessionId}:`, streamErr.message)
          })
        })
        
        // Additional connection health check
        const conn: any = session.connection
        if (conn._sock) {
          if (conn._sock.destroyed || conn._sock.readyState !== 'open') {
            console.log(`Connection socket unhealthy for ${sessionId}, cleaning up...`)
            cleanupSession(sessionId)
            return
          }
        }
        
      } catch (error) {
        keepAliveFailCount++
        console.log(`Keep-alive error for ${sessionId} (${keepAliveFailCount}/${maxKeepAliveFailures}):`, error)
        
        if (keepAliveFailCount >= maxKeepAliveFailures) {
          cleanupSession(sessionId)
        }
      }
    }, 30000) // Send keep-alive every 30 seconds (based on web research)
    
    // Additional server-alive check inspired by SSH config findings
    const serverAliveInterval = setInterval(() => {
      try {
        // Send minimal command to test server responsiveness
        session.connection!.exec('echo "server_alive_test"', { pty: false }, (err: any, stream: any) => {
          if (err) {
            console.log(`Server alive test failed for ${sessionId}:`, err.message)
            return
          }
          
          let testOutput = ''
          const testTimeout = setTimeout(() => {
            console.log(`Server alive test timeout for ${sessionId}`)
          }, 5000)
          
          stream.on('data', (data: Buffer) => {
            testOutput += data.toString()
          })
          
          stream.on('close', () => {
            clearTimeout(testTimeout)
            if (testOutput.includes('server_alive_test')) {
              console.log(`Server alive test passed for ${sessionId}`)
            }
          })
        })
      } catch (error) {
        console.log(`Server alive test error for ${sessionId}:`, error)
      }
    }, 120000) // Test every 2 minutes
    
    // Store the intervals in the session
    session.keepAlive = keepAlive
    session.serverAliveInterval = serverAliveInterval
  }
  
  activeSessions.set(sessionId, session)

  // Extended auto cleanup - 4 hours of inactivity (more generous)
  const cleanup = setTimeout(() => {
    console.log(`Session ${sessionId} timed out after 4 hours of inactivity`)
    cleanupSession(sessionId)
  }, 4 * 60 * 60 * 1000) // 4 hours

  connectionTimeouts.set(sessionId, cleanup)
}

// Update session activity and reset timeout
export const updateSessionActivity = (sessionId: string): void => {
  const session = activeSessions.get(sessionId)
  if (session) {
    session.lastActivity = Date.now()
    
    // Reset the cleanup timeout
    const existingTimeout = connectionTimeouts.get(sessionId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    const newTimeout = setTimeout(() => {
      console.log(`Session ${sessionId} timed out after 2 hours of inactivity`)
      cleanupSession(sessionId)
    }, 2 * 60 * 60 * 1000) // 2 hours
    
    connectionTimeouts.set(sessionId, newTimeout)
  }
}

// Get all sessions
export const getAllSessions = (): Array<{ sessionId: string; session: SSHSession }> => {
  return Array.from(activeSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    session
  }))
}

// Get session count
export const getSessionCount = (): number => {
  return activeSessions.size
}

// Get sessions by type
export const getSessionsByType = () => {
  const sessions = Array.from(activeSessions.values())
  return {
    total: sessions.length,
    real: sessions.length
  }
}

// Health check for sessions - FIXED: Less aggressive
export const checkSessionHealth = (sessionId: string): boolean => {
  const session = activeSessions.get(sessionId)
  if (!session || !session.connection || !session.connected) {
    return false
  }
  
  // Check if the connection is still alive
  try {
    // ONLY check if socket is destroyed (most reliable indicator)
    const conn: any = session.connection
    if (conn._sock && conn._sock.destroyed) {
      console.log(`Session ${sessionId} socket destroyed`)
      return false
    }
    
    // If socket exists and not destroyed, consider it healthy
    // Don't check readable/writable as they can be false during PTY operations
    if (conn._sock) {
      return true
    }
    
    // Fallback: if connection object exists and marked connected, trust it
    return session.connected === true
  } catch (error) {
    console.log(`Session ${sessionId} health check error:`, error)
    // On error, assume healthy to avoid premature disconnection
    return true
  }
}

// Force session validation with real command test
export const validateSessionWithCommand = async (sessionId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const session = activeSessions.get(sessionId)
    if (!session || !session.connection || !session.connected) {
      resolve(false)
      return
    }

    // Test with a simple command
    const timeout = setTimeout(() => {
      resolve(false)
    }, 5000)

    session.connection.exec('echo "session_test"', (err: any, stream: any) => {
      clearTimeout(timeout)
      
      if (err) {
        console.log(`Session ${sessionId} validation failed:`, err.message)
        resolve(false)
        return
      }

      let output = ''
      stream.on('data', (data: Buffer) => {
        output += data.toString()
      })

      stream.on('close', () => {
        const isValid = output.includes('session_test')
        console.log(`Session ${sessionId} validation result:`, isValid)
        resolve(isValid)
      })

      stream.on('error', () => {
        resolve(false)
      })
    })
  })
} 