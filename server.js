// Custom Next.js server with Socket.io integration
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

// Import long-running task manager
let longRunningTaskManager = null

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT) || 5000

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let sessionManager = null

app.prepare().then(async () => {
  // Load session manager after Next.js is prepared
  try {
    // FIX: Import .ts file directly (Next.js handles transpilation)
    const sessionManagerModule = await import('./app/lib/ssh-session-manager.ts')
    sessionManager = {
      getSession: sessionManagerModule.getSession,
      storeSession: sessionManagerModule.storeSession,
      updateSessionActivity: sessionManagerModule.updateSessionActivity,
      cleanupSession: sessionManagerModule.cleanupSession,
      getAllSessions: sessionManagerModule.getAllSessions
    }
    console.log('✅ Session manager loaded successfully')
    console.log('🔧 Session manager functions:', Object.keys(sessionManager))
  } catch (e) {
    console.error('❌ Failed to load session manager:', e.message)
    console.error('❌ Full error:', e)
    console.log('⚠️ WebSocket authentication will not work')
    // Create fallback session manager
    sessionManager = {
      getSession: () => null,
      storeSession: () => {},
      updateSessionActivity: () => {},
      cleanupSession: () => {},
      getAllSessions: () => []
    }
  }
  
  // Load long-running task manager
  try {
    const taskManagerModule = await import('./app/lib/long-running-task-manager.ts')
    longRunningTaskManager = taskManagerModule.longRunningTaskManager
    console.log('✅ Long-running task manager loaded successfully')
  } catch (e) {
    console.error('❌ Failed to load task manager:', e.message)
    console.log('⚠️ Long-running tasks will not be tracked')
  }

  // Load AI conversation session manager
  let conversationSessionManager = null
  try {
    const convSessionModule = await import('./app/lib/ai-conversation-session-manager.ts')
    conversationSessionManager = {
      createSession: convSessionModule.createConversationSession,
      getSession: convSessionModule.getConversationSession,
      addMessage: convSessionModule.addMessageToSession,
      getContext: convSessionModule.getSessionContext,
      cleanup: convSessionModule.cleanupExpiredSessions,
      getStats: convSessionModule.getSessionStats,
      deleteSession: convSessionModule.deleteConversationSession
    }
    
    // Cleanup expired sessions every 5 minutes
    setInterval(() => {
      conversationSessionManager.cleanup()
    }, 5 * 60 * 1000)
    
    // Expose session context getter globally for API routes
    global.getConversationContext = conversationSessionManager.getContext
    
    console.log('✅ AI conversation session manager loaded successfully')
  } catch (e) {
    console.error('❌ Failed to load conversation session manager:', e.message)
    console.log('⚠️ Conversation sessions will not be managed')
  }

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.io with production-ready CORS
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? "*" : [
        process.env.FRONTEND_URL || `http://${hostname}:${port}`,
        process.env.ALLOWED_ORIGINS?.split(',') || []
      ].flat(),
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
    // Production optimizations
    pingTimeout: dev ? 60000 : 30000,
    pingInterval: dev ? 25000 : 10000
  })

  io.on('connection', (socket) => {
    console.log('🔌 WebSocket client connected:', socket.id)
    
    // Increase max listeners to prevent warning
    socket.setMaxListeners(50)
    
    let currentSession = null
    let currentSessionId = null  // FIX: Track session ID separately
    let sshShell = null
    let activeCommand = null
    let commandStartTime = null
    let detectedOS = null  // Track OS type for platform-aware command execution

    // Handle session authentication with retry logic
    socket.on('auth', async ({ sessionId }) => {
      console.log('🔐 Authenticating session:', sessionId)
      console.log('🔧 Session manager available:', !!sessionManager)
      
      if (!sessionManager) {
        console.error('❌ Session manager not loaded')
        socket.emit('error', { message: 'Session manager not available' })
        return
      }
      
      console.log('🔍 Looking for session:', sessionId)
      
      // RETRY LOGIC: Wait for session to be stored (fixes first attempt failure)
      let session = null
      let attempts = 0
      const maxAttempts = 3
      
      while (!session && attempts < maxAttempts) {
        session = sessionManager.getSession(sessionId)
        
        if (!session) {
          attempts++
          if (attempts < maxAttempts) {
            console.log(`⏳ Session not found yet, retrying... (attempt ${attempts}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
      // Debug: Show all sessions if still not found
      if (!session) {
        const allSessions = sessionManager.getAllSessions?.() || []
        console.log('📊 Total active sessions:', allSessions.length)
        if (allSessions.length > 0) {
          console.log('📋 Available sessions:', allSessions.map(s => s.sessionId))
        }
      }
      
      if (!session || !session.connection || !session.connected) {
        console.log('❌ Invalid session after retries:', sessionId)
        console.log('🔧 Session exists:', !!session)
        console.log('🔧 Has connection:', !!session?.connection)
        console.log('🔧 Is connected:', !!session?.connected)
        socket.emit('error', { message: 'Session not found or disconnected. Please try again.' })
        return
      }
      
      console.log('✅ Session found after', attempts, 'attempts')

      currentSession = session
      currentSessionId = sessionId  // FIX: Store session ID for later use
      console.log('✅ Session found, updating activity')
      
      try {
        sessionManager.updateSessionActivity(sessionId)
      } catch (activityError) {
        console.error('⚠️ Activity update failed:', activityError)
      }

      console.log('🔧 Creating SSH shell...')
      console.log('🔧 SSH connection object:', {
        connected: session.connected,
        hasConnection: !!session.connection,
        connectionReadyState: session.connection ? 'exists' : 'missing'
      })

      try {
        // Create interactive shell for real-time communication
        session.connection.shell((err, stream) => {
          if (err) {
            console.error('❌ Shell creation error:', err)
            socket.emit('error', { message: 'Failed to create shell: ' + err.message })
            return
          }

          sshShell = stream
          console.log('✅ Shell created successfully for session:', sessionId)

          // Set initial terminal size - will be updated by client
          stream.setWindow(24, 80, 480, 640)
          console.log('📐 Initial SSH PTY size: 80 cols x 24 rows (waiting for client dimensions)')
          
          // FIX: Send initial newline to trigger prompt display
          // Many SSH servers don't send their prompt until they receive input
          stream.write('\n')
          console.log('✅ Sent initial newline to trigger prompt')

          // AUTO OS DETECTION: Capture initial SSH banner and prompt
          // NOTE: DO NOT write any commands - just capture what SSH naturally sends
          setTimeout(() => {
            console.log('🔍 Listening for OS information from SSH banner...')
            
            let capturedOutput = ''
            let captureComplete = false
            
            const outputListener = (data) => {
              if (captureComplete) return
              
              const output = Buffer.isBuffer(data) ? data.toString('utf8') : data.toString()
              capturedOutput += output
              
              // Check if we have OS information in the output
              const hasOSInfo = capturedOutput.includes('Microsoft Windows') || 
                               capturedOutput.includes('Linux') || 
                               capturedOutput.includes('Darwin') ||
                               capturedOutput.includes('GNU') ||
                               capturedOutput.includes('Ubuntu') ||
                               capturedOutput.includes('Debian') ||
                               capturedOutput.includes('CentOS') ||
                               capturedOutput.includes('Red Hat') ||
                               capturedOutput.includes('Welcome to')
              
              // Check for shell prompt (indicates ready)
              const hasPrompt = /[$#>]\s*$/.test(capturedOutput) || 
                               /C:\\[^>]*>\s*$/.test(capturedOutput) ||
                               /@[^:]+:[^$#]+[$#]\s*$/.test(capturedOutput)
              
              if (hasOSInfo && hasPrompt) {
                captureComplete = true
                const osInfoClean = capturedOutput.trim()
                console.log('✅ OS Info captured from SSH banner:', osInfoClean.substring(0, 150))
                
                // Detect and store OS type for platform-aware command execution
                const isWindows = /Microsoft Windows|C:\\|asus@ASUS|@DESKTOP|Windows|PS\s+[A-Z]:\\/i.test(osInfoClean)
                const isLinux = /Linux|Ubuntu|Debian|CentOS|Red Hat|GNU/i.test(osInfoClean)
                
                detectedOS = isWindows ? 'windows' : (isLinux ? 'linux' : 'unknown')
                console.log(`🖥️ Detected OS type: ${detectedOS} (will use ${detectedOS === 'windows' ? '\\r\\n' : '\\n'} for commands)`)
                
                // Send to agent context for immediate use
                socket.emit('agent:os-info', {
                  osInfo: osInfoClean,
                  osType: detectedOS,  // Include OS type for client
                  timestamp: Date.now(),
                  autoDetected: true,
                  sessionId: socket.sessionId
                })
                
                console.log('📤 OS info sent to agent context (no commands executed)')
                stream.removeListener('data', outputListener)
              }
            }
            
            stream.on('data', outputListener)
            
            // Timeout after 3 seconds
            setTimeout(() => {
              if (!captureComplete) {
                console.log('✅ Initial capture complete (OS info may be in terminal history)')
                stream.removeListener('data', outputListener)
              }
            }, 3000)
          }, 1000) // Wait 1 second for initial banner

          // Enhanced SSH output forwarding with command tracking and completion detection
          stream.on('data', (data) => {
            // Preserve all bytes as-is to maintain ANSI sequences and formatting
            let output
            if (Buffer.isBuffer(data)) {
              // Direct buffer to string conversion preserving all control characters
              output = data.toString('utf8')
            } else {
              output = data.toString()
            }
            
            // Debug output (limited to prevent spam)
            if (output.length < 200) {
              console.log('📤 SSH output:', JSON.stringify(output.substring(0, 100)))
            }
            
            // ENHANCED: Send output to both terminal and agent with metadata
            const outputMetadata = {
              timestamp: Date.now(),
              commandId: activeCommand?.id,
              isError: detectError(output),
              isComplete: detectCommandCompletion(output, activeCommand?.command)
            }
            
            // Send to terminal (existing)
            socket.emit('output', output)
            
            // Send to agent with metadata (NEW)
            socket.emit('agent:output', {
              output,
              metadata: outputMetadata,
              commandId: activeCommand?.id,
              timestamp: Date.now()
            })
            
            // NEW: Process output for long-running tasks
            if (activeCommand && activeCommand.id && longRunningTaskManager) {
              try {
                longRunningTaskManager.processOutput(activeCommand.id, output)
              } catch (taskError) {
                console.error('⚠️ Task manager error:', taskError.message)
              }
            }
            
            // Check for command completion
            if (activeCommand && outputMetadata.isComplete) {
              const duration = Date.now() - (commandStartTime || Date.now())
              
              socket.emit('command:complete', {
                commandId: activeCommand.id,
                command: activeCommand.command,
                success: !outputMetadata.isError,
                duration,
                output: outputMetadata.isError ? undefined : output,
                error: outputMetadata.isError ? output : undefined
              })
              
              console.log(`✅ Command completed: ${activeCommand.command} (${duration}ms)`)
              activeCommand = null
              commandStartTime = null
            }
          })

          stream.stderr.on('data', (data) => {
            // Same preservation for stderr
            let output
            if (Buffer.isBuffer(data)) {
              output = data.toString('utf8')
            } else {
              output = data.toString()
            }
            
            socket.emit('output', output)
          })

          stream.on('close', () => {
            console.log('🔌 SSH shell closed for session:', sessionId)
            socket.emit('shell-closed')
          })

          stream.on('error', (streamErr) => {
            console.error('❌ SSH shell error:', streamErr)
            socket.emit('error', { message: 'Shell error: ' + streamErr.message })
          })

          // Send initial prompt
          console.log('🚀 Emitting ready event for session:', sessionId)
          socket.emit('ready', { 
            message: 'Shell ready',
            sessionId: sessionId
          })
          console.log('✅ Ready event emitted successfully')
        })

      } catch (error) {
        console.error('❌ Shell setup error:', error)
        socket.emit('error', { message: 'Shell setup failed' })
      }
    })

    // Enhanced input handler with command tracking
    socket.on('input', (data) => {
      console.log('📥 Server received input:', data.length, 'bytes', data.replace(/\n/g, '\\n').substring(0, 50))
      
      if (!sshShell || !currentSession) {
        console.error('❌ No active shell session for input')
        socket.emit('error', { message: 'No active shell session' })
        return
      }

      try {
        if (sessionManager) {
          sessionManager.updateSessionActivity(currentSessionId || 'unknown')
        }
        
        // Track command execution if it's a new command
        if (data.includes('\n') && data.trim().length > 0) {
          const command = data.replace(/\n$/, '').trim()
          if (command && command.charCodeAt(0) > 31 && command.charCodeAt(0) !== 127) { // Not a control character
            activeCommand = {
              id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              command: command,
              source: 'user'
            }
            commandStartTime = Date.now()
            
            console.log(`🔧 Tracking command execution: ${command} (ID: ${activeCommand.id})`)
            
            // Notify clients that command started
            socket.emit('command:sent', {
              commandId: activeCommand.id,
              command: command,
              source: 'user'
            })
          }
        }
        
        sshShell.write(data)
      } catch (error) {
        console.error('❌ Input write error:', error)
        socket.emit('error', { message: 'Failed to send input' })
      }
    })

    // NEW: Handle agent commands with tracking
    socket.on('agent:command', ({ command, commandId, source }) => {
      console.log(`🤖 Agent command received: ${command} (ID: ${commandId})`)
      
      if (!sshShell || !currentSession) {
        socket.emit('error', { message: 'No active shell session for agent command' })
        return
      }

      try {
        // Track agent command
        activeCommand = { id: commandId, command, source }
        commandStartTime = Date.now()
        
        // Use platform-appropriate newline (CRITICAL FIX for Windows SSH)
        const newline = detectedOS === 'windows' ? '\r\n' : '\n'
        console.log(`📤 Sending command with ${detectedOS || 'unknown'} OS newline (${newline === '\r\n' ? '\\r\\n' : '\\n'}): ${command}`)
        sshShell.write(command + newline)
        
        // Notify that command was sent
        socket.emit('command:sent', { commandId, command, source })
        
        console.log(`📤 Agent command sent to shell: ${command}`)
        
      } catch (error) {
        console.error('❌ Agent command error:', error)
        socket.emit('error', { message: 'Failed to execute agent command: ' + error.message })
      }
    })

    // Handle window resize - CRITICAL for commands like 'top' to use full width
    socket.on('resize', ({ cols, rows }) => {
      console.log(`📐 Resize request: ${cols} cols x ${rows} rows`)
      
      if (!sshShell) {
        console.warn('⚠️ No shell available for resize')
        return
      }
      
      try {
        // Set PTY window size: rows, cols, height_px, width_px
        sshShell.setWindow(rows, cols, rows * 18, cols * 8)
        console.log(`✅ SSH PTY resized to: ${cols} cols x ${rows} rows`)
        
        // Send SIGWINCH signal to update running programs (like top, vim, htop)
        try {
          if (sshShell && typeof sshShell.signal === 'function') {
            sshShell.signal('WINCH')
            console.log(`📡 SIGWINCH signal sent`)
          }
        } catch (error) {
          // SIGWINCH not supported on all SSH servers (Windows, some Linux)
          // This is non-critical - terminal still resizes via setWindow()
          // No need to spam logs - completely normal
        }
      } catch (error) {
        console.error('❌ Resize error:', error)
      }
    })

    // Handle heartbeat for session keepalive
    socket.on('heartbeat', ({ sessionId }) => {
      if (sessionManager && sessionId) {
        try {
          sessionManager.updateSessionActivity(sessionId)
          socket.emit('heartbeat-ack', { sessionId, timestamp: Date.now() })
        } catch (error) {
          console.error('❌ Heartbeat error:', error)
        }
      }
    })

    // NEW: Handle long-running task cancellation
    socket.on('task:cancel', async ({ taskId }) => {
      if (longRunningTaskManager) {
        try {
          console.log(`🛑 Cancelling task: ${taskId}`)
          await longRunningTaskManager.cancelTask(taskId, socket)
        } catch (error) {
          console.error('❌ Task cancel error:', error)
        }
      }
    })

    // NEW: Handle task pause
    socket.on('task:pause', async ({ taskId }) => {
      if (longRunningTaskManager) {
        try {
          console.log(`⏸️ Pausing task: ${taskId}`)
          await longRunningTaskManager.pauseTask(taskId)
        } catch (error) {
          console.error('❌ Task pause error:', error)
        }
      }
    })

    // NEW: Handle task resume
    socket.on('task:resume', async ({ taskId }) => {
      if (longRunningTaskManager) {
        try {
          console.log(`▶️ Resuming task: ${taskId}`)
          await longRunningTaskManager.resumeTask(taskId, socket)
        } catch (error) {
          console.error('❌ Task resume error:', error)
        }
      }
    })

    // Conversation Session Handlers
    socket.on('create-conversation-session', ({ model }, callback) => {
      if (conversationSessionManager) {
        try {
          const sessionId = conversationSessionManager.createSession(undefined, model)
          callback({ success: true, sessionId })
          console.log(`✅ Created conversation session: ${sessionId} for model: ${model}`)
        } catch (error) {
          callback({ success: false, error: error.message })
        }
      } else {
        callback({ success: false, error: 'Session manager not available' })
      }
    })

    socket.on('add-to-conversation-session', async ({ sessionId, message }, callback) => {
      if (conversationSessionManager) {
        try {
          await conversationSessionManager.addMessage(sessionId, message)
          callback({ success: true })
        } catch (error) {
          callback({ success: false, error: error.message })
        }
      } else {
        callback({ success: false, error: 'Session manager not available' })
      }
    })

    socket.on('get-conversation-stats', (callback) => {
      if (conversationSessionManager) {
        const stats = conversationSessionManager.getStats()
        callback({ success: true, stats })
      } else {
        callback({ success: false, error: 'Session manager not available' })
      }
    })

    // AI Model Streaming Handlers with Session Management via OpenRouter
    socket.on('ai:chat', async ({ messages, model, stream = true, conversationSessionId = null, webSearchEnabled = false }) => {
      console.log('🤖 AI chat request via WebSocket:', model, webSearchEnabled ? '🌐 (with web search)' : '')
      
      try {
        // Use OpenRouter for all AI requests
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
        const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
        
        if (!OPENROUTER_API_KEY) {
          throw new Error('OpenRouter API key not configured')
        }
        
        // Get session context for cost optimization
        let effectiveMessages = messages
        let sessionSummary = null
        let sessionStats = null
        
        if (conversationSessionId && conversationSessionManager) {
          const sessionContext = conversationSessionManager.getContext(conversationSessionId)
          if (sessionContext) {
            sessionSummary = sessionContext.summary
            sessionStats = sessionContext.stats
            
            // Use only recent messages from session (last 10)
            const recentSessionMessages = sessionContext.messages.slice(-10)
            
            console.log(`📊 WebSocket Session ${conversationSessionId}: ${sessionStats.total} total, ${sessionStats.recent} recent, ${sessionStats.summarized} summarized, ${sessionStats.tokensSaved} tokens saved`)
            
            // Construct messages with session context
            if (sessionSummary) {
              effectiveMessages = [...recentSessionMessages, ...messages]
            } else {
              effectiveMessages = [...recentSessionMessages, ...messages]
            }
          }
        }
        
        // Emit start event
        socket.emit('ai:stream', { type: 'start' })
        
        // Map internal model ID to OpenRouter format
        const openRouterModel = model === 'claude-sonnet-4-5' ? 'anthropic/claude-sonnet-4.5' : 'anthropic/claude-sonnet-4.5'
        
        console.log(`[WebSocket OpenRouter] Model: ${openRouterModel}`)
        if (sessionStats) {
          console.log(`💰 Cost optimization active: ${sessionStats.tokensSaved} tokens saved in this session`)
        }
        
        // Use OpenRouter streaming API
        const fetch = (await import('undici')).fetch
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Latenite AI'
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: effectiveMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 4000
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
        }
        
        if (!response.body) {
          throw new Error('No response body from OpenRouter')
        }
        
        // Read the stream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim() !== '')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              
              if (data === '[DONE]') {
                continue
              }
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                
                if (content) {
                  socket.emit('ai:stream', { type: 'content', content })
                }
              } catch (e) {
                // Skip invalid JSON
                console.warn('Failed to parse SSE data:', data)
              }
            }
          }
        }
        
        // Emit done event
        socket.emit('ai:stream', { type: 'done' })
        
      } catch (error) {
        console.error('❌ AI streaming error:', error)
        socket.emit('ai:stream', { type: 'error', error: error.message })
      }
    })

    // **NEW: Handle SSH auto-reconnect after server reboot**
    socket.on('ssh:auto-reconnect', async ({ host, port: sshPort, username, password, privateKey, passphrase, originalSessionId }, callback) => {
      console.log(`🔄 Auto-reconnect request for ${username}@${host}`)
      
      try {
        const { Client } = await import('ssh2')
        const conn = new Client()
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        let connectionTimeout = setTimeout(() => {
          console.log('⏰ SSH connection timeout')
          callback({ success: false, error: 'Connection timeout - server may still be booting' })
          try {
            conn.end()
          } catch (e) {}
        }, 15000)
        
        conn.on('ready', () => {
          clearTimeout(connectionTimeout)
          console.log(`✅ SSH auto-reconnected successfully: ${newSessionId}`)
          
          conn.shell({ term: 'xterm-256color' }, (err, stream) => {
            if (err) {
              console.error('❌ Shell creation failed:', err.message)
              callback({ success: false, error: err.message })
              return
            }
            
            console.log(`🐚 Shell ready for new session ${newSessionId}`)
            
            // Store session in session manager
            if (sessionManager && typeof sessionManager.storeSession === 'function') {
              sessionManager.storeSession(newSessionId, {
                connection: conn,
                host,
                username,
                connected: true,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                authMethod: password ? 'Password' : 'SSH Key',
                shellReady: true
              })
              console.log(`💾 Session stored: ${newSessionId}`)
            }
            
            // Set up shell event handlers
            stream.on('data', (data) => {
              socket.emit('output', data.toString())
              socket.emit('agent:output', {
                output: data.toString(),
                metadata: {
                  timestamp: Date.now(),
                  isComplete: false
                }
              })
            })
            
            stream.on('close', () => {
              console.log(`🔌 Auto-reconnected shell closed: ${newSessionId}`)
              socket.emit('disconnect', { sessionId: newSessionId })
            })
            
            stream.on('error', (err) => {
              console.error('❌ Shell error:', err.message)
              socket.emit('error', { error: err.message })
            })
            
            // Enable keepalive
            conn.on('keepalive', () => {
              if (sessionManager && typeof sessionManager.updateSessionActivity === 'function') {
                sessionManager.updateSessionActivity(newSessionId)
              }
            })
            
            // Success - return new session ID to frontend
            callback({ 
              success: true, 
              sessionId: newSessionId,
              message: 'SSH auto-reconnected successfully',
              serverInfo: {
                host,
                user: username,
                authUsed: password ? 'Password' : 'SSH Key',
                terminalReady: true
              }
            })
            
            // Send ready event
            socket.emit('ready', { 
              sessionId: newSessionId, 
              shellReady: true,
              reconnected: true,
              originalSessionId
            })
          })
        })
        
        conn.on('error', (err) => {
          clearTimeout(connectionTimeout)
          console.error('❌ Auto-reconnect failed:', err.message)
          
          // Provide specific error messages
          let errorMessage = err.message
          if (err.level === 'client-authentication') {
            errorMessage = 'Authentication failed - credentials may have changed'
          } else if (err.message.includes('ECONNREFUSED')) {
            errorMessage = 'Connection refused - server may still be booting'
          } else if (err.message.includes('ETIMEDOUT')) {
            errorMessage = 'Connection timeout - server not responding yet'
          } else if (err.message.includes('EHOSTUNREACH')) {
            errorMessage = 'Host unreachable - check network connection'
          }
          
          callback({ success: false, error: errorMessage })
        })
        
        // Attempt connection with saved credentials
        const connectionConfig = {
          host,
          port: sshPort || 22,  // FIX: Use sshPort instead of server port
          username,
          readyTimeout: 15000,
          keepaliveInterval: 10000,
          keepaliveCountMax: 3,
          ...(password && { password }),
          ...(privateKey && { 
            privateKey: Buffer.from(privateKey),
            ...(passphrase && { passphrase })
          })
        }
        
        console.log(`🔌 Connecting to ${username}@${host}:${connectionConfig.port}...`)
        conn.connect(connectionConfig)
        
      } catch (error) {
        console.error('❌ Auto-reconnect error:', error)
        callback({ 
          success: false, 
          error: error.message || 'Unknown reconnection error'
        })
      }
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('🔌 WebSocket client disconnected:', socket.id)
      
      if (sshShell) {
        try {
          sshShell.end()
        } catch (error) {
          console.error('❌ Error closing shell:', error)
        }
      }
    })
  })

  // Helper functions for enhanced command tracking and completion detection
  
  // Detect errors in command output
  function detectError(output) {
    const errorPatterns = [
      /command not found/i,
      /permission denied/i,
      /no such file or directory/i,
      /failed|error/i,
      /cannot|unable to/i,
      /access denied/i,
      /invalid|illegal/i,
      /fatal:|critical:|emergency:/i
    ]
    
    return errorPatterns.some(pattern => pattern.test(output))
  }
  
  // Detect command completion with advanced heuristics
  function detectCommandCompletion(output, command) {
    if (!command) return false
    
    // Basic prompt patterns
    const promptPatterns = [
      /([^@\s]+@[^:]+:[^$#]+[$#])\s*$/,
      /^\[[^\]]+\][$#]\s*$/,
      /^[\w.-]+:.*[$#]\s*$/
    ]
    
    // Check for prompt
    const hasPrompt = promptPatterns.some(pattern => pattern.test(output))
    
    // Command-specific completion patterns
    const baseCommand = command.split(' ')[0]
    const commandCompletionPatterns = {
      'ls': /^(total \d+|drwx|^-rw)/m,
      'ps': /^\s*PID.*COMMAND/m,
      'systemctl': /(Active:|Loaded:|Main PID:)/m,
      'df': /^Filesystem.*Available.*Use%.*Mounted on/m,
      'free': /^(Mem:|total.*used.*free)/m,
      'apt': /(Reading package lists|Setting up|Processing triggers|Done)/m,
      'yum': /(Complete!|Nothing to do)/m,
      'ping': /^\d+ packets transmitted.*received/m
    }
    
    const completionPattern = commandCompletionPatterns[baseCommand]
    const hasCommandOutput = completionPattern ? completionPattern.test(output) : false
    
    // Interactive commands (don't complete on first output)
    const interactiveCommands = ['top', 'htop', 'less', 'more', 'vi', 'vim', 'nano']
    if (interactiveCommands.includes(baseCommand)) {
      // Interactive commands only complete when explicitly exited
      return hasPrompt && (output.includes('exit') || output.includes('quit'))
    }
    
    // Command is complete if we see a prompt or command-specific completion
    return hasPrompt || hasCommandOutput
  }

  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`✅ Next.js + Socket.io server ready on http://${hostname}:${port}`)
    console.log('🔌 WebSocket server ready for SSH connections with enhanced agent sync')
  })
})