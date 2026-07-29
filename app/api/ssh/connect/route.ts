import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'ssh2'
import { 
  storeSession, 
  cleanupSession, 
  getSessionsByType 
} from '../../../lib/ssh-session-manager'
import { credentialManager } from '../../../lib/ssh-credential-manager'
import { rateLimiter, RATE_LIMITS, getClientIdentifier } from '../../../lib/utils/rate-limiter'
import type { SSHCredentials, SSHConnectionConfig, SSHConnectionResult } from '../../../types'

// Initialize terminal environment on connection
// DISABLED - Let AI agent handle terminal setup, not forced commands!
async function initializeTerminalForConnection(connection: any): Promise<void> {
  // Agent will detect OS from natural terminal output and run setup if needed
  console.log('🤖 Skipping forced terminal setup - AI agent in control')
  return Promise.resolve()
}

// Validate SSH private key format
const validateSSHKey = (keyContent: string): { valid: boolean; error?: string } => {
  if (!keyContent || keyContent.trim().length === 0) {
    return { valid: false, error: 'SSH key content is empty' }
  }

  const trimmedKey = keyContent.trim()
  
  // Check for common SSH key formats
  const validHeaders = [
    '-----BEGIN RSA PRIVATE KEY-----',
    '-----BEGIN DSA PRIVATE KEY-----', 
    '-----BEGIN EC PRIVATE KEY-----',
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    '-----BEGIN PRIVATE KEY-----'
  ]
  
  const hasValidHeader = validHeaders.some(header => trimmedKey.startsWith(header))
  if (!hasValidHeader) {
    return { valid: false, error: 'Invalid SSH key format. Key must start with proper header (e.g., -----BEGIN RSA PRIVATE KEY-----)' }
  }

  const lines = trimmedKey.split('\n')
  if (lines.length < 3) {
    return { valid: false, error: 'SSH key appears to be incomplete' }
  }

  return { valid: true }
}

// Enhanced SSH connection with retry logic and algorithm fallback
async function createRealSSHConnection(
  host: string, 
  username: string, 
  authConfig: Partial<SSHCredentials>, 
  retryCount: number = 0
): Promise<SSHConnectionResult> {
  const maxRetries = 3
  const retryDelay = 2000 * (retryCount + 1) // Progressive delay: 2s, 4s, 6s
  
  return new Promise((resolve, reject) => {
    const conn = new Client()
    let connectionResolved = false
    
    // Increased connection timeout for problematic networks
    const connectTimeout = setTimeout(() => {
      if (!connectionResolved) {
        connectionResolved = true
        conn.destroy()
        
        // Retry on timeout if retries available
        if (retryCount < maxRetries) {
          console.log(`Connection timeout, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`)
          setTimeout(async () => {
            try {
              const result = await createRealSSHConnection(host, username, authConfig, retryCount + 1)
              resolve(result)
            } catch (retryError) {
              reject(retryError)
            }
          }, retryDelay)
          return
        }
        
        reject({
          success: false,
          message: `Connection timeout: Could not connect to ${host} after ${maxRetries + 1} attempts (30 seconds each)`
        })
      }
    }, 30000) // 30 second timeout per attempt

    conn.on('ready', async () => {
      if (connectionResolved) return
      connectionResolved = true
      clearTimeout(connectTimeout)
      
      const sessionId = `ssh_${host}_${username}_${Date.now()}`
      
      // DON'T auto-initialize - let AI agent handle terminal setup
      // This allows agent to see raw terminal state and make intelligent decisions
      console.log(`🔧 Terminal ready - AI agent will handle setup for ${username}@${host}`)
      
      // Store session using shared session manager
      storeSession(sessionId, {
        connection: conn,
        host,
        username,
        connected: true,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        authMethod: authConfig.useKey ? "SSH Key" : "Password",
        shellReady: false
      })
      
      // FIX: Store credentials securely in-memory for auto-reconnect
      credentialManager.saveCredentials(sessionId, {
        host,
        port: 22,
        username,
        password: authConfig.password,
        privateKey: authConfig.keyContent,
        passphrase: authConfig.passphrase,
        authMethod: authConfig.useKey ? 'key' : 'password'
      })
      
      console.log(`✅ SSH connection established: ${username}@${host}`)
      
      resolve({
        success: true,
        sessionId,
        authMethod: authConfig.useKey ? "SSH Key" : "Password",
        wsURL: `/api/ssh/websocket?sessionId=${sessionId}`,
        serverInfo: {
          os: "Connected Server",
          authUsed: authConfig.useKey ? "SSH Key Authentication" : "Password Authentication",
          host: host,
          user: username,
          terminalReady: true
        }
        // FIX: Credentials removed - stored server-side in credentialManager
      })
    })
    
    conn.on('error', async (err) => {
      if (connectionResolved) return
      connectionResolved = true
      clearTimeout(connectTimeout)
      
      console.error(`❌ SSH connection error for ${username}@${host} (attempt ${retryCount + 1}):`, err.message)
      
      let errorMessage = 'SSH connection failed'
      let shouldRetry = false
      
      // Enhanced error handling with retry logic for recoverable errors
      if (err.message.includes('ENOTFOUND')) {
        errorMessage = `Host not found: ${host}. Check if the hostname/IP is correct.`
      } else if (err.message.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused by ${host}. SSH server may not be running on port 22.`
        shouldRetry = true // Network might be temporarily down
      } else if (err.message.includes('Authentication')) {
        errorMessage = 'Authentication failed. Check your username, password, or SSH key.'
        // Don't retry on auth failures - they won't succeed
      } else if (err.message.includes('EHOSTUNREACH')) {
        errorMessage = `Host unreachable: ${host}. Check network connectivity.`
        shouldRetry = true // Network issue might be temporary
      } else if (err.message.includes('ETIMEDOUT')) {
        errorMessage = `Connection timed out to ${host}. Check firewall settings.`
        shouldRetry = true // Timeout might be temporary
      } else if (err.message.includes('ECONNRESET')) {
        errorMessage = `Connection reset by ${host}. Server might be overloaded.`
        shouldRetry = true // Server might recover
      } else if (err.message.includes('EPIPE') || err.message.includes('broken pipe')) {
        errorMessage = `Broken pipe error. Network connection interrupted.`
        shouldRetry = true // Network issue
      } else if (err.message.includes('key')) {
        errorMessage = 'SSH key authentication failed. Check if your private key is correct and properly formatted.'
      } else if (err.message.includes('All configured authentication methods failed')) {
        errorMessage = 'All authentication methods failed. Check credentials and server configuration.'
      } else {
        errorMessage = `SSH Error: ${err.message}`
        shouldRetry = true // Try again for unknown errors
      }
      
      // Retry for recoverable errors
      if (shouldRetry && retryCount < maxRetries) {
        console.log(`Retrying SSH connection in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`)
        setTimeout(async () => {
          try {
            const result = await createRealSSHConnection(host, username, authConfig, retryCount + 1)
            resolve(result)
          } catch (retryError) {
            reject(retryError)
          }
        }, retryDelay)
        return
      }
      
      reject({
        success: false,
        message: errorMessage,
        errorCode: err.level || (err as any).code,
        host,
        username,
        retriesAttempted: retryCount,
        finalAttempt: true
      })
    })
    
    conn.on('close', () => {
      console.log(`🔌 SSH connection closed: ${username}@${host}`)
    })
    
    // Enhanced connection configuration with robust keep-alive and compatibility
    const connectionConfig: any = {
      host,
      port: 22,
      username,
      
      // Connection timeouts - increased for better network compatibility
      readyTimeout: 30000,        // 30 seconds for initial connection
      timeout: 15000,             // 15 seconds for socket timeout
      
      // Enhanced keep-alive based on web research findings
      keepaliveInterval: 30000,   // Send keepalive every 30 seconds (more frequent)
      keepaliveCountMax: 10,      // Allow up to 10 failed keepalives (5 minutes total)
      
      // Additional SSH2 options for broken pipe prevention
      serverAliveInterval: 60,    // Client-side keep-alive (seconds)
      serverAliveCountMax: 5,     // Max failed keep-alives before disconnect
      
      // Algorithm configuration with progressive fallback
      algorithms: retryCount === 0 ? {
        // First attempt: Modern compatible algorithms
        kex: [
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384', 
          'ecdh-sha2-nistp521',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group14-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-cbc',
          'aes192-cbc',
          'aes256-cbc'
        ],
        serverHostKey: [
          'ssh-rsa',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521'
        ],
        hmac: [
          'hmac-sha2-256',
          'hmac-sha2-512', 
          'hmac-sha1'
        ]
      } : {
        // Fallback attempt: Most basic algorithms for maximum compatibility
        kex: [
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1'
        ],
        cipher: [
          'aes128-cbc',
          'aes256-cbc',
          '3des-cbc'
        ],
        serverHostKey: [
          'ssh-rsa',
          'ssh-dss'
        ],
        hmac: [
          'hmac-sha1',
          'hmac-md5'
        ]
      },
      
      // Compression for better performance over slow connections
      compress: false,  // Disable compression initially for compatibility
      
      // Force authentication methods
      forceIPv4: false,
      forceIPv6: false,
      
      // Additional options for problematic networks  
      tryKeyboard: true,          // Enable keyboard-interactive auth
      authHandler: ['password', 'keyboard-interactive', 'publickey', 'none'],
      
      // Debug settings for comprehensive logging - always enabled for troubleshooting
      debug: (info: string) => {
        console.log(`SSH Debug [${host}]: ${info}`)
      }
    }
    
    if (authConfig.useKey && authConfig.privateKey) {
      // Validate SSH key before attempting connection
      const keyValidation = validateSSHKey(authConfig.privateKey)
      if (!keyValidation.valid) {
        connectionResolved = true
        clearTimeout(connectTimeout)
        reject({
          success: false,
          message: keyValidation.error
        })
        return
      }
      
      connectionConfig.privateKey = authConfig.privateKey
      
      // Optional: Add passphrase support
      if (authConfig.passphrase) {
        connectionConfig.passphrase = authConfig.passphrase
      }
    } else if (authConfig.password) {
      connectionConfig.password = authConfig.password
    } else {
      connectionResolved = true
      clearTimeout(connectTimeout)
      reject({
        success: false,
        message: 'No authentication method provided'
      })
      return
    }
    
    try {
      console.log(`🔄 Attempting SSH connection to ${username}@${host}...`)
      conn.connect(connectionConfig)
    } catch (error: any) {
      if (connectionResolved) return
      connectionResolved = true
      clearTimeout(connectTimeout)
      reject({
        success: false,
        message: `Connection setup failed: ${error.message}`
      })
    }
  })
}



export async function POST(request: NextRequest) {
  // Rate limiting - prevent SSH connection abuse
  const clientId = getClientIdentifier(request)
  const rateLimit = rateLimiter.check(clientId, RATE_LIMITS.SSH_CONNECT)
  
  if (rateLimit.limited) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    return NextResponse.json({
      success: false,
      message: rateLimit.error,
      retryAfter
    }, {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': RATE_LIMITS.SSH_CONNECT.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
      }
    })
  }

  try {
    const body = await request.json()
    const { host, username, useKey, password, keyContent, passphrase } = body
    
    // Validation
    if (!host || !username) {
      return NextResponse.json({
        success: false,
        message: "Host and username are required"
      }, { status: 400 })
    }

    if (!useKey && !password) {
      return NextResponse.json({
        success: false,
        message: "Password is required for password authentication"
      }, { status: 400 })
    }

    if (useKey && !keyContent) {
      return NextResponse.json({
        success: false,
        message: "SSH key content is required for key authentication"
      }, { status: 400 })
    }

    // Prepare authentication configuration
    const authConfig: any = {
      useKey: useKey || false
    }
    
    if (useKey && keyContent) {
      authConfig.privateKey = keyContent.trim()
      if (passphrase) {
        authConfig.passphrase = passphrase
      }
    } else if (password) {
      authConfig.password = password
    }

    console.log(`🔄 SSH connection request: ${username}@${host} (${useKey ? 'Key' : 'Password'} auth)`)

    // Try real SSH connection
    try {
      const result = await createRealSSHConnection(host, username, authConfig)
      return NextResponse.json(result)
    } catch (error: any) {
      console.error('SSH connection failed:', error)
      
      return NextResponse.json({
        success: false,
        message: error.message || 'SSH connection failed',
        details: error.errorCode ? `Error code: ${error.errorCode}` : undefined
      }, { status: 500 })
    }

  } catch (error) {
    console.error('SSH API error:', error)
    return NextResponse.json({
      success: false,
      message: "Connection error: " + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

export async function GET() {
  const sessionStats = getSessionsByType()
  
  return NextResponse.json({
    success: true,
    message: "SSH connection endpoint ready",
    status: "operational",
    features: [
      "Real SSH connections to any server",
      "Password and SSH key authentication",
      "Session management with auto-cleanup",
      "Enhanced error diagnostics",
      "Connection timeout handling"
    ],
    statistics: {
      activeSessions: sessionStats.total,
      activeConnections: sessionStats.real
    }
  })
}

 