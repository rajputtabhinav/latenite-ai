import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'ssh2'
import { 
  getSession, 
  updateSessionActivity, 
  getSessionsByType,
  checkSessionHealth,
  cleanupSession,
  validateSessionWithCommand
} from '../../../lib/ssh-session-manager'

// Initialize terminal environment based on web search findings
async function initializeTerminalEnvironment(connection: any): Promise<void> {
  return new Promise((resolve, reject) => {
    // First, check and switch to bash if needed (based on web search findings)
    connection.exec('echo $0', (err: any, stream: any) => {
      if (err) {
        console.log('Shell detection failed, continuing...')
        resolve()
        return
      }
      
      let shellOutput = ''
      stream.on('data', (data: Buffer) => {
        shellOutput += data.toString()
      })
      
      stream.on('close', () => {
        // If using dash or sh, switch to bash
        if (shellOutput.includes('/bin/sh') || shellOutput.includes('dash')) {
          console.log('Detected non-bash shell, switching to bash...')
          connection.exec('chsh -s /bin/bash || /bin/bash', (bashErr: any, bashStream: any) => {
            if (bashErr) {
              console.log('Bash switch failed, using current shell')
            }
            bashStream?.on('close', () => resolve())
            bashStream?.on('error', () => resolve())
          })
        } else {
          resolve()
        }
      })
      
      stream.on('error', () => resolve())
    })
  })
}

// Enhanced terminal environment setup for different OS compatibility
// DISABLED - Let AI agent handle OS detection and terminal setup
async function setupTerminalEnvironment(connection: any): Promise<void> {
  // No forced commands - agent will detect OS from natural terminal output
  console.log('🤖 Terminal environment: Letting AI agent handle setup')
  return Promise.resolve()
}

// Linux-specific terminal setup with enhanced ANSI support
function applyLinuxTerminalSettings(connection: any, resolve: () => void): void {
  const linuxCommands = [
    'export TERM=xterm-256color',
    'export COLORTERM=truecolor',       // Enable 24-bit color support
    'export FORCE_COLOR=1',             // Force color output
    'export CLICOLOR=1',                // Enable CLI colors
    'export CLICOLOR_FORCE=1',          // Force CLI colors
    'stty sane',
    'stty erase ^?',                    // Fix backspace
    'stty werase ^W',                   // Fix word erase
    'stty kill ^U',                     // Fix line kill
    'stty eof ^D',                      // Fix EOF
    'stty start ^Q stop ^S',            // Flow control
    'stty -echo',                       // Disable local echo (let terminal handle it)
    'stty raw',                         // Enable raw mode for better control char handling
    'set +H 2>/dev/null || true',       // Disable history expansion (bash)
    'export SHELL=/bin/bash 2>/dev/null || true',
    'alias ls="ls --color=always"',     // Force colored ls output
    'alias grep="grep --color=always"', // Force colored grep
    'alias dir="dir --color=always"'    // Force colored dir
  ].join(' && ')
  
  connection.exec(linuxCommands, (err: any, stream: any) => {
    if (err) console.log('Linux terminal setup failed:', err.message)
    stream?.on('close', () => resolve())
    stream?.on('error', () => resolve())
    stream?.on('data', () => {})
    setTimeout(() => resolve(), 5000)
  })
}

// macOS-specific terminal setup with enhanced ANSI support
function applyMacOSTerminalSettings(connection: any, resolve: () => void): void {
  const macCommands = [
    'export TERM=xterm-256color',
    'export COLORTERM=truecolor',
    'export FORCE_COLOR=1',
    'export CLICOLOR=1',
    'export CLICOLOR_FORCE=1',
    'stty sane',
    'stty erase ^?',
    'stty werase ^W',
    'stty kill ^U',
    'stty -echo',
    'stty raw',
    'export SHELL=/bin/bash 2>/dev/null || export SHELL=/bin/zsh',
    'set +H 2>/dev/null || true',
    'alias ls="ls -G"',                 // macOS colored ls
    'alias grep="grep --color=always"'
  ].join(' && ')
  
  connection.exec(macCommands, (err: any, stream: any) => {
    if (err) console.log('macOS terminal setup failed:', err.message)
    stream?.on('close', () => resolve())
    stream?.on('error', () => resolve())
    stream?.on('data', () => {})
    setTimeout(() => resolve(), 5000)
  })
}

// BSD-specific terminal setup
function applyBSDTerminalSettings(connection: any, resolve: () => void): void {
  const bsdCommands = [
    'export TERM=xterm-256color',
    'stty sane',
    'stty erase ^?',
    'stty werase ^W',
    'stty kill ^U',
    'export SHELL=/bin/sh 2>/dev/null || true',
    'set +H 2>/dev/null || true'
  ].join(' && ')
  
  connection.exec(bsdCommands, (err: any, stream: any) => {
    if (err) console.log('BSD terminal setup failed:', err.message)
    stream?.on('close', () => resolve())
    stream?.on('error', () => resolve())
    stream?.on('data', () => {})
    setTimeout(() => resolve(), 5000)
  })
}

// Generic terminal setup for unknown systems
function applyGenericTerminalSettings(connection: any, resolve: () => void): void {
  const genericCommands = [
    'export TERM=xterm-256color',
    'stty sane 2>/dev/null || true',
    'stty erase ^? 2>/dev/null || true',
    'set +H 2>/dev/null || true'
  ].join(' && ')
  
  connection.exec(genericCommands, (err: any, stream: any) => {
    if (err) console.log('Generic terminal setup failed:', err.message)
    stream?.on('close', () => resolve())
    stream?.on('error', () => resolve())
    stream?.on('data', () => {})
    setTimeout(() => resolve(), 3000)
  })
}

// Real SSH command execution with enhanced error handling and health checking
async function executeRealSSHCommand(sessionId: string, command: string): Promise<any> {
  const session = getSession(sessionId)
  if (!session?.connection || !session.connected) {
    throw {
      success: false,
      message: 'SSH session not found or connection lost. Please reconnect.',
      needsReconnect: true
    }
  }

  // FIXED: Don't run aggressive health check during command execution
  // Session already validated above - connection is active

  // Additional validation for critical commands
  if (command.includes('sudo') || command.includes('rm') || command.includes('shutdown')) {
    const isValid = await validateSessionWithCommand(sessionId)
    if (!isValid) {
      console.log(`Session ${sessionId} failed command validation, cleaning up...`)
      cleanupSession(sessionId)
      throw {
        success: false,
        message: 'SSH session validation failed. Please reconnect for security.',
        needsReconnect: true
      }
    }
  }

  return new Promise((resolve, reject) => {

    // Update last activity
    updateSessionActivity(sessionId)

    console.log(`🔄 Executing SSH command: ${command}`)

    // Prepare command with better terminal support
    let enhancedCommand = command
    
    // For interactive commands, ensure proper terminal environment
    if (command.includes('vi') || command.includes('nano') || command.includes('less') || command.includes('more')) {
      enhancedCommand = `TERM=xterm-256color ${command}`
    }
    
    // For bash-specific commands, ensure bash is used
    if (command.includes('cd') || command.includes('export') || command.includes('source')) {
      enhancedCommand = `bash -c "${command}"`
    }

    // Setup enhanced terminal environment if needed (for first command)
    if (command.trim() === 'env_setup' || command.includes('terminal_init')) {
      setupTerminalEnvironment(session.connection)
        .then(() => {
          resolve({
            success: true,
            output: 'Terminal environment initialized successfully',
            command: 'terminal_init',
            timestamp: new Date().toISOString(),
            mode: 'setup'
          })
        })
        .catch((setupError) => {
          console.log('Terminal setup failed:', setupError)
          // Continue with normal command execution even if setup fails
        })
      return
    }

    // Execute command on remote server with enhanced ANSI support
    session.connection.exec(enhancedCommand, { 
      pty: true,  // Request a pseudo-terminal for better compatibility
      env: {
        'TERM': 'xterm-256color',
        'COLORTERM': 'truecolor',
        'FORCE_COLOR': '1',
        'CLICOLOR': '1', 
        'CLICOLOR_FORCE': '1',
        'SHELL': '/bin/bash',
        'PATH': '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
        'LC_ALL': 'C.UTF-8',
        'LANG': 'C.UTF-8'
      } as any
    }, (err: any, stream: any) => {
      if (err) {
        console.error(`❌ SSH exec error: ${err.message}`)
        
        // If it's a connection error, mark for reconnection
        if (err.message.includes('Not connected') || err.message.includes('connection')) {
          cleanupSession(sessionId)
          reject({
            success: false,
            message: `Connection lost: ${err.message}`,
            needsReconnect: true
          })
          return
        }
        
        reject({
          success: false,
          message: `Command execution failed: ${err.message}`,
          command,
          error: err.message
        })
        return
      }
      
      let stdout = ''
      let stderr = ''
      let exitCode = null
      
      // Handle command output
      stream.on('close', (code: number, signal: string) => {
        exitCode = code
        console.log(`✅ SSH command completed with exit code: ${code}`)
        
        const output = stdout || stderr || `Command completed (exit code: ${code})`
        
        resolve({
          success: true,
          output: output.trim(),
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          signal,
          command,
          timestamp: new Date().toISOString(),
          mode: 'real-ssh'
        })
      })
      
      stream.on('data', (data: Buffer) => {
        // Preserve ANSI sequences by using binary first then utf8
        const rawChunk = data.toString('binary')
        const chunk = Buffer.from(rawChunk, 'binary').toString('utf8')
        stdout += chunk
        
        // Debug ANSI sequences
        if (chunk.includes('\x1b')) {
          console.log(`🎨 SSH stdout with ANSI: ${chunk.replace(/\x1b/g, '\\x1b')}`)
        } else {
          console.log(`📤 SSH stdout: ${chunk}`)
        }
      })
      
      stream.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8')
        stderr += chunk
        console.log(`📤 SSH stderr: ${chunk}`)
      })
      
      // Handle stream errors
      stream.on('error', (streamError: any) => {
        console.error(`❌ SSH stream error: ${streamError.message}`)
        
        // Check if it's a connection-related error
        if (streamError.message.includes('connection') || streamError.message.includes('socket')) {
          cleanupSession(sessionId)
          reject({
            success: false,
            message: `Connection lost during command execution: ${streamError.message}`,
            command,
            needsReconnect: true
          })
          return
        }
        
        reject({
          success: false,
          message: `Stream error: ${streamError.message}`,
          command,
          error: streamError.message
        })
      })
      
      // Set timeout for long-running commands (increased to 60 seconds)
      const commandTimeout = setTimeout(() => {
        stream.destroy()
        reject({
          success: false,
          message: 'Command execution timeout (60 seconds)',
          command,
          timeout: true
        })
      }, 60000) // 60 second timeout
      
      stream.on('close', () => {
        clearTimeout(commandTimeout)
      })
    })
  })
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.type === 'command') {
      const { content: command, sessionId, username } = body
      
      if (!command || command.trim().length === 0) {
        return NextResponse.json({
          success: false,
          message: "Command cannot be empty"
        }, { status: 400 })
      }

      console.log(`🔄 Terminal command request: "${command}" (session: ${sessionId})`)
      
      // Real SSH command execution only
      if (!sessionId) {
        return NextResponse.json({
          success: false,
          message: "Session ID is required for command execution"
        }, { status: 400 })
      }

      try {
        const result = await executeRealSSHCommand(sessionId, command)
        return NextResponse.json(result)
      } catch (error: any) {
        console.error('SSH command execution failed:', error)
        
        // If session lost, suggest reconnection
        if (error.needsReconnect) {
          return NextResponse.json({
            success: false,
            message: error.message,
            needsReconnect: true,
            suggestion: 'Please reconnect to SSH server'
          }, { status: 410 }) // Gone - resource no longer available
        }
        
        return NextResponse.json({
          success: false,
          message: error.message || 'Command execution failed',
          command,
          error: error.error
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: false,
      message: "Invalid request type. Expected 'command'."
    }, { status: 400 })

  } catch (error) {
    console.error('Terminal API error:', error)
    return NextResponse.json({
      success: false,
      message: "Terminal execution error: " + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

export async function GET() {
  const sessionStats = getSessionsByType()
  
  return NextResponse.json({
    success: true,
    message: "SSH Terminal endpoint ready",
    status: "operational",
    features: [
      "Real SSH command execution",
      "Session-based command history",
      "Enhanced error handling",
      "Command timeout protection",
      "Secure remote shell access"
    ],
    statistics: {
      activeSessions: sessionStats.total,
      activeConnections: sessionStats.real
    }
  })
} 