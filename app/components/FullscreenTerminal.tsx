'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X, Settings, Wifi, WifiOff, Home, Bot } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import AIAgent from './AIAgent'
import SSHHistory from './SSHHistory'
import SmartSuggestions from './SmartSuggestions'
import { TerminalColoredText } from '../lib/terminal-colors'
import SSHConnectionModal from './SSHConnectionModal'
import SessionChoiceModal from './SessionChoiceModal'
import { sessionTracker } from '../lib/terminal-session-tracker'
import { multiTabSessionManager } from '../lib/multi-tab-session-manager'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

// Import the types we need
type XTermTerminalRef = any  // Simplified type

interface XTermTerminalProps {
  socket?: any
  onData?: (data: string) => void
  onResize?: (cols: number, rows: number) => void
  onCommandDetected?: (command: string) => void
  className?: string
  style?: React.CSSProperties
}

// Dynamic import with proper forwardRef support
const EnhancedXTermTerminal = dynamic(
  () => import('./EnhancedXTermTerminal'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">
      <div className="text-gray-400">Loading terminal...</div>
    </div>
  }
)

interface Suggestion {
  type: 'command' | 'fix' | 'optimization' | 'tip'
  title: string
  description: string
  code?: string
  confidence: number
}

interface FullscreenTerminalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FullscreenTerminal({ isOpen, onClose }: FullscreenTerminalProps) {
  const xtermRef = useRef<XTermTerminalRef>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [currentPath, setCurrentPath] = useState('~')
  const [isConnected, setIsConnected] = useState(false)
  const lastSentDimensions = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 })
  const [sshCredentials, setSshCredentials] = useState({
    host: '',
    username: '',
    password: '',
    keyContent: '',
    useKey: false
  })
  const [showSSHModal, setShowSSHModal] = useState(false)
  // NEW: Multi-tab session management
  const [showSessionChoice, setShowSessionChoice] = useState(false)
  const [existingSessions, setExistingSessions] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [sessionId, setSessionId] = useState<string>('')
  const [isAgentOpen, setIsAgentOpen] = useState(true)  // Agent open by default for instant access
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [lastCommand, setLastCommand] = useState<string>('')
  
  // WebSocket state for real-time SSH communication
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isShellReady, setIsShellReady] = useState(false)
  const terminalContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore session on mount
  useEffect(() => {
    if (isOpen && isRestoring) {
      // Try to restore SSH session
      const savedSSH = localStorage.getItem('latenite_ssh_session')
      if (savedSSH) {
        try {
          const session = JSON.parse(savedSSH)
          const fourHours = 4 * 60 * 60 * 1000 // Extended to 4 hours
          
          // FIX: Validate session age
          if (Date.now() - session.savedAt < fourHours) {
            console.log('🔍 Validating saved session...')
            
            // FIX: Verify session exists on server before attempting reconnect
            fetch(`/api/ssh/status?sessionId=${session.sessionId}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.active) {
                  console.log('✅ Session still active on server, restoring...')
            setSshCredentials({
              host: session.host,
              username: session.username,
              password: '', // Don't persist passwords
              keyContent: '',
              useKey: false
            })
            setSessionId(session.sessionId)
                  setIsConnected(true)
                  
                  // Reconnect WebSocket
                  const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
                    transports: ['websocket', 'polling'],
                    timeout: 10000
                  })
                  
                  newSocket.on('connect', () => {
                    console.log('🔌 Reconnected to existing session')
                    newSocket.emit('auth', { sessionId: session.sessionId })
                  })
                  
                  newSocket.on('ready', () => {
                    setIsShellReady(true)
                    console.log('✅ Session restored successfully')
                  })
                  
                  newSocket.on('error', (error: any) => {
                    console.error('❌ Restoration failed:', error)
                    const errorMessage = typeof error === 'string' ? error : error?.message || 'Connection error'
                    
                    // FIX: Properly cleanup failed restoration
                    localStorage.removeItem('latenite_ssh_session')
                    setIsConnected(false)
                    setSessionId('')
                    setIsShellReady(false)
                    setShowSSHModal(true)
                    
                    // Disconnect to stop retries
                    newSocket.disconnect()
                  })
                  
                  // FIX: Add output handler for restored sessions
                  newSocket.on('output', (data: string) => {
                    // Output will be handled by EnhancedXTermTerminal via socket prop
                  })
                  
                  newSocket.on('shell-closed', () => {
                    console.log('🔌 SSH shell closed')
                    setIsConnected(false)
                    setIsShellReady(false)
                    localStorage.removeItem('latenite_ssh_session')
                  })
                  
                  setSocket(newSocket)
                } else {
                  console.log('❌ Session no longer active, clearing...')
                  localStorage.removeItem('latenite_ssh_session')
                  setShowSSHModal(true)
                }
              })
              .catch(error => {
                console.log('❌ Session validation failed:', error)
                localStorage.removeItem('latenite_ssh_session')
                setShowSSHModal(true)
              })
          } else {
            console.log('⏰ Session expired, clearing...')
            localStorage.removeItem('latenite_ssh_session')
            setShowSSHModal(true)
          }
        } catch (error) {
          console.error('Failed to restore session:', error)
          localStorage.removeItem('latenite_ssh_session')
          setShowSSHModal(true)
        }
      } else {
        // No saved session in this tab - check if other tabs have sessions
        const otherSessions = multiTabSessionManager.getOtherTabSessions()
        
        if (otherSessions.length > 0) {
          console.log(`📊 Found ${otherSessions.length} active SSH session(s) in other tab(s)`)
          setExistingSessions(otherSessions)
          setTimeout(() => {
            setShowSessionChoice(true)
          }, 500)
        } else {
          // No sessions anywhere, show SSH modal
          console.log('ℹ️ No active SSH sessions found, showing connection modal')
          setTimeout(() => {
            setShowSSHModal(true)
          }, 500)
        }
      }
      
      setIsRestoring(false)
    }
  }, [isOpen, isRestoring])

  // Cleanup socket connection on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        console.log('🧹 Cleaning up WebSocket connection')
        socket.disconnect()
      }
    }
  }, [socket])

  // Enhanced auto-scrolling with intelligent behavior
  useEffect(() => {
    const scrollToBottom = () => {
      if (terminalContainerRef.current) {
        const terminal = terminalContainerRef.current
        const isNearBottom = terminal.scrollHeight - terminal.clientHeight - terminal.scrollTop < 100
        
        // Only auto-scroll if user is near the bottom or if it's new output
        if (isNearBottom || output.length <= 5) {
          // Use smooth scrolling for better UX
          terminal.scrollTo({
            top: terminal.scrollHeight,
            behavior: 'smooth'
          })
        }
      }
    }
    
    // Delay scrolling slightly to allow content to render
    const scrollTimer = setTimeout(scrollToBottom, 50)
    return () => clearTimeout(scrollTimer)
  }, [output])

  const handleSSHConnect = async () => {
    setConnectionStatus('connecting')
    setOutput(prev => [...prev, `🔐 Connecting to ${sshCredentials.username}@${sshCredentials.host}...`])

    try {
      const response = await fetch('/api/ssh/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: sshCredentials.host,
          username: sshCredentials.username,
          useKey: sshCredentials.useKey,
          password: sshCredentials.useKey ? undefined : sshCredentials.password,
          keyContent: sshCredentials.useKey ? sshCredentials.keyContent : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        setIsConnected(true)
        setConnectionStatus('connected')
        setShowSSHModal(false)
        setSessionId(result.sessionId) // Store session ID for command execution
        
        // Add to SSH history
        if ((window as any).sshHistory?.addConnection) {
          (window as any).sshHistory.addConnection(sshCredentials.host, sshCredentials.username)
        }
        
        // **NEW: Save credentials for auto-reconnect**
        if (result.credentials) {
          const { credentialManager } = await import('../lib/ssh-credential-manager')
          credentialManager.saveCredentials(result.sessionId, {
            host: result.credentials.host,
            port: result.credentials.port || 22,
            username: result.credentials.username,
            password: result.credentials.password,
            privateKey: result.credentials.privateKey,
            passphrase: result.credentials.passphrase,
            authMethod: result.credentials.authMethod,
            savedAt: Date.now(),
            sessionId: result.sessionId,
            expiresAt: Date.now() + (1000 * 60 * 60 * 4)
          })
          console.log('🔐 SSH credentials saved for auto-reconnect')
          console.log(`   Valid for 4 hours until: ${new Date(Date.now() + (1000 * 60 * 60 * 4)).toLocaleString()}`)
        }
        
        // **NEW: Register session for multi-tab management**
        multiTabSessionManager.registerSession(
          result.sessionId,
          sshCredentials.host,
          sshCredentials.username
        )
        
        // 📊 NEW: Start session tracking for documentation
        sessionTracker.startSession(
          result.sessionId,
          sshCredentials.host,
          sshCredentials.username
        )
        console.log('📊 Session tracking initialized for documentation')
        
        setOutput(prev => [
          ...prev,
          `✅ Connected to ${sshCredentials.host}`,
          `🌐 Session established as ${sshCredentials.username}`,
          `🔐 Authentication: ${result.authMethod}`,
          result.serverInfo?.authUsed ? `📋 ${result.serverInfo.authUsed}` : '',
          result.serverInfo?.warning ? `⚠️ ${result.serverInfo.warning}` : '',
          '',
          '🔌 Establishing real-time shell connection...'
        ])

        // Close existing socket if any
        if (socket) {
          socket.disconnect()
        }

        // Establish WebSocket connection for real-time terminal
        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
          transports: ['websocket', 'polling'],
          forceNew: true,
          timeout: 20000
        })

        newSocket.on('connect', () => {
          console.log('🔌 WebSocket connected with ID:', newSocket.id)
          setOutput(prev => [...prev, '🔌 Real-time connection established'])
          
          // FIX: Increased delay to ensure session is fully stored on server
          setTimeout(() => {
            console.log('🔐 Authenticating with session ID:', result.sessionId)
          newSocket.emit('auth', { sessionId: result.sessionId || '' })
          }, 1000) // 1000ms delay for reliable session propagation
        })

        newSocket.on('ready', () => {
          console.log('✅ SSH shell ready')
          setIsShellReady(true)
          // XTermTerminal will handle the display, just update state
          setOutput(prev => [...prev, '✅ SSH shell ready'])
          
          // Focus XTerm terminal when ready
          setTimeout(() => {
            if (xtermRef.current) {
              xtermRef.current.focus()
            }
          }, 100)
        })

        newSocket.on('error', (error: any) => {
          console.error('❌ WebSocket error:', error)
          const errorMessage = typeof error === 'string' ? error : error?.message || 'Connection error'
          setOutput(prev => [...prev, `❌ Error: ${errorMessage}`])
          
          // FIX: Clear invalid session to prevent retry loops
          if (errorMessage.includes('No active shell session') || 
              errorMessage.includes('Session not found') || 
              errorMessage.includes('disconnected')) {
            console.log('🧹 Clearing invalid session from storage')
            localStorage.removeItem('latenite-ssh-session')
            localStorage.removeItem('latenite_ssh_session')
            setIsConnected(false)
            setSessionId('')
            setIsShellReady(false)
            
            // Disconnect socket to stop retry attempts
            newSocket.disconnect()
            setSocket(null)
          }
        })

        // XTermTerminal component handles 'output' events directly via socket prop
        // No need to handle it here to avoid duplicate processing

        newSocket.on('shell-closed', () => {
          console.log('🔌 SSH shell closed')
          setIsConnected(false)
          setIsShellReady(false)
          setOutput(prev => [...prev, '🔌 SSH connection closed'])
        })

        // Store the socket reference
        setSocket(newSocket)
        setSessionId(result.sessionId || '')
        
        // Save SSH session for persistence
        localStorage.setItem('latenite_ssh_session', JSON.stringify({
          host: sshCredentials.host,
          username: sshCredentials.username,
          sessionId: result.sessionId,
          connectedAt: Date.now(),
          savedAt: Date.now(),
          isConnected: true
        }))
        console.log('💾 SSH session saved for auto-reconnect')
      } else {
        setConnectionStatus('error')
        setOutput(prev => [...prev, `❌ Connection failed: ${result.message}`])
        setTimeout(() => setConnectionStatus('idle'), 3000)
      }
    } catch (error) {
      setConnectionStatus('error')
      setOutput(prev => [...prev, `❌ Connection error: Network unreachable`])
      setTimeout(() => setConnectionStatus('idle'), 3000)
    }
  }

  const executeCommand = async (command: string) => {
    if (!command.trim()) return

    // Track command for smart suggestions
    setLastCommand(command)

    const prompt = isConnected ? `${sshCredentials.username}@${sshCredentials.host}` : 'abhinav@latenite'
    setOutput(prev => [...prev, `${prompt}:${currentPath}$ ${command}`])
    
    if (!isConnected) {
      // Local commands
      switch (command.toLowerCase()) {
        case 'help':
          setOutput(prev => [...prev,
            '🔧 Available Commands:',
            '  ssh           - Connect to remote server',
            '  clear         - Clear terminal',
            '  ls            - List directory contents',
            '  pwd           - Show current directory',
            '  whoami        - Show current user',
            '  date          - Show current date/time',
            '  latenite      - Show Latenite AI capabilities',
            ''
          ])
          break
        case 'clear':
          setOutput([])
          return
        case 'ls':
          setOutput(prev => [...prev,
            'Desktop    Documents    Downloads    Pictures',
            'Music      Videos       Projects     .ssh',
            ''
          ])
          break
        case 'pwd':
          setOutput(prev => [...prev, `/home/abhinav${currentPath}`, ''])
          break
        case 'whoami':
          setOutput(prev => [...prev, 'abhinav', ''])
          break
        case 'date':
          setOutput(prev => [...prev, new Date().toString(), ''])
          break
        case 'ssh':
          setShowSSHModal(true)
          return
        case 'latenite':
          setOutput(prev => [...prev,
            '🧠 Latenite AI Terminal Capabilities:',
            '  • Neural-powered code analysis',
            '  • Quantum-resistant SSH connections', 
            '  • AI-driven automation',
            '  • Real-time performance optimization',
            '  • Cross-platform compatibility',
            ''
          ])
          break
        default:
          if (command.startsWith('ssh ')) {
            const parts = command.split(' ')
            if (parts.length >= 2) {
              const [user, host] = parts[1].includes('@') ? parts[1].split('@') : ['', parts[1]]
              setSshCredentials(prev => ({ ...prev, host, username: user || 'root' }))
              setShowSSHModal(true)
              return
            }
          }
          setOutput(prev => [...prev, `Command not found: ${command}`, ''])
          break
      }
    } else {
      // SSH commands via WebSocket - real-time streaming like PuTTY
      if (!socket || !isShellReady) {
        setOutput(prev => [...prev, 
          `❌ SSH Error: Shell not ready`,
          `💡 Please wait for shell connection to be established`,
          `🔐 Real-time SSH session required for command execution`,
          ''
        ])
        return
      }

      // Send command directly to SSH shell via WebSocket
      socket.emit('input', command + '\n')
      
      // Commands sent via WebSocket - output streams back automatically
    }

    setOutput(prev => [...prev, `${prompt}:${currentPath}$ `])
  }

  const handleCodeInsert = (code: string) => {
    setInput(code)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Execute command directly (no typing animation - faster and more reliable)
  const executeCommandDirect = async (command: string, explanation?: string): Promise<void> => {
    if (!socket || !isShellReady) {
      throw new Error('SSH not connected')
    }

    console.log(`⚡ Executing command: ${command}`)
    if (explanation) {
      console.log(`💡 Explanation: ${explanation}`)
    }

    // Detect platform for proper newline
    const isWindows = /C:\\|Users\\|@ASUS/i.test(currentPath || '')
    const newline = isWindows ? '\r\n' : '\n'
    
    console.log(`🖥️ Platform: ${isWindows ? 'Windows' : 'Linux/Unix'}, newline: ${JSON.stringify(newline)}`)
    
    // Send command directly with proper newline
    socket.emit('input', command + newline)
    
    // Wait for output (with proper completion detection)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Legacy alias for backward compatibility
  const executeCommandWithTyping = executeCommandDirect

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input)
      setInput('')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Basic tab completion
      if (input === 'lat') {
        setInput('latenite ')
      }
    }
  }

  // AI-powered suggestion generator
  const generateSmartSuggestions = async (terminalOutput: string[], currentCmd: string) => {
    const recentOutput = terminalOutput.slice(-10).join('\n')
    const newSuggestions: Suggestion[] = []

    // Error detection
    if (recentOutput.toLowerCase().includes('error') || 
        recentOutput.toLowerCase().includes('failed') ||
        recentOutput.includes('command not found')) {
      
      if (recentOutput.includes('command not found')) {
        const cmdMatch = recentOutput.match(/([^\s:]+):\s*command not found/)
        if (cmdMatch) {
          newSuggestions.push({
            type: 'fix',
            title: 'Command Not Found',
            description: `Install ${cmdMatch[1]} or check if it's in your PATH`,
            code: `sudo apt install ${cmdMatch[1]} || sudo yum install ${cmdMatch[1]}`,
            confidence: 0.85
          })
        }
      }

      if (recentOutput.includes('Permission denied')) {
        newSuggestions.push({
          type: 'fix',
          title: 'Permission Denied',
          description: 'Try running with sudo or check file permissions',
          code: currentCmd.startsWith('sudo') ? `chmod +x ${currentCmd.split(' ').pop()}` : `sudo ${lastCommand}`,
          confidence: 0.90
        })
      }

      if (recentOutput.includes('No such file or directory')) {
        newSuggestions.push({
          type: 'fix',
          title: 'File/Directory Not Found',
          description: 'Verify the path exists or create it',
          code: 'ls -la && pwd',
            confidence: 0.75
        })
      }
    }

    // Performance optimization suggestions
    if (currentPath.includes('/var/log') || lastCommand.includes('log')) {
      newSuggestions.push({
        type: 'optimization',
        title: 'Clear Old Logs',
        description: 'Free up disk space by cleaning old log files',
        code: 'sudo journalctl --vacuum-size=100M',
        confidence: 0.70
      })
    }

    // Context-aware command suggestions
    if (lastCommand.includes('git clone') && !lastCommand.includes('cd')) {
      const repoName = lastCommand.match(/([^/]+)\.git/)?.[1]
      if (repoName) {
        newSuggestions.push({
          type: 'command',
          title: 'Navigate to Cloned Repo',
          description: 'Enter the newly cloned directory',
          code: `cd ${repoName}`,
          confidence: 0.95
        })
      }
    }

    if (lastCommand === 'npm install' || lastCommand === 'npm i') {
      newSuggestions.push({
        type: 'command',
        title: 'Start Development Server',
        description: 'Run the dev server after installing dependencies',
        code: 'npm run dev',
        confidence: 0.88
      })
    }

    if (lastCommand.includes('docker build')) {
      newSuggestions.push({
        type: 'command',
        title: 'Run Docker Container',
        description: 'Start a container from the built image',
        code: 'docker run -d -p 3000:3000 <image-name>',
        confidence: 0.85
      })
    }

    // System monitoring tips
    if (recentOutput.includes('CPU') || recentOutput.includes('memory')) {
      newSuggestions.push({
        type: 'tip',
        title: 'Monitor System Resources',
        description: 'Use htop for better system monitoring',
        code: 'htop || top',
        confidence: 0.70
      })
    }

    setSuggestions(newSuggestions.slice(0, 3)) // Show max 3 suggestions
  }

  // Monitor terminal output for smart suggestions
  useEffect(() => {
    if (output.length > 0 && isConnected) {
      generateSmartSuggestions(output, lastCommand)
    }
  }, [output, lastCommand, isConnected])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col"
        onClick={(e) => {
          // Only close when clicking on the backdrop itself
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full h-full bg-gray-900 flex overflow-hidden"
        >
          {/* Terminal Section - Adjusts width when agent is open */}
          <div className={`flex flex-col h-full transition-all duration-300 ${isAgentOpen ? 'flex-1' : 'w-full'}`}>
            {/* Terminal Header - FIXED POSITION */}
            <div className="sticky top-0 bg-gray-800 px-4 py-2 flex items-center justify-end border-b border-gray-700 z-10 flex-shrink-0">
              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* Agent Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAgentOpen(!isAgentOpen)}
                  className={`px-2 py-1 rounded text-sm flex items-center space-x-1 transition-all duration-200 ${
                    isAgentOpen
                      ? 'bg-primary-orange text-white hover:bg-orange-600'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span className="hidden sm:inline">Agent</span>
                </motion.button>
                
                {/* SSH Button */}
                <button
                  onClick={() => setShowSSHModal(true)}
                  className="bg-primary-orange hover:bg-orange-600 text-white px-2 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Connect SSH</span>
                </button>
                
                {/* Home Link */}
                <Link href="/" className="text-gray-400 hover:text-white flex items-center space-x-1">
                  <Home className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Home</span>
                </Link>
                
                {/* SSH History Component - Far Right */}
                <SSHHistory 
                  onConnect={(connection) => {
                    setSshCredentials(prev => ({ 
                      ...prev, 
                      host: connection.host, 
                      username: connection.username 
                    }))
                    setShowSSHModal(true)
                  }}
                  currentConnection={isConnected ? { host: sshCredentials.host, username: sshCredentials.username } : null}
                  isConnected={isConnected}
                />
              </div>
            </div>

            {/* Terminal Content - Full XTerm.js Display */}
            <div className="flex-1 flex flex-col bg-black overflow-hidden min-h-0">
              {/* Smart Suggestions - Context-aware AI suggestions */}
              {suggestions.length > 0 && (
                <div className="px-4 py-2 bg-gray-900/95 border-b border-gray-800">
                  <SmartSuggestions
                    suggestions={suggestions}
                    onApply={(code) => {
                      if (socket && isShellReady) {
                        console.log(`✨ Applying suggestion: ${code}`)
                        socket.emit('input', code + '\n')
                        setLastCommand(code)
                      }
                    }}
                    onDismiss={(index) => {
                      setSuggestions(prev => prev.filter((_, i) => i !== index))
                    }}
                    className="max-w-4xl mx-auto"
                  />
                </div>
              )}
              
              {/* Enhanced XTerm Terminal - Full Screen with advanced features */}
              <div className="flex-1 w-full overflow-hidden">
                <EnhancedXTermTerminal
                  ref={xtermRef}
                  socket={socket}
                  onData={(data: string) => {
                    // Input is handled directly by EnhancedXTermTerminal
                  }}
                  onResize={(cols: number, rows: number) => {
                    // Only send to server if dimensions actually changed
                    if (cols !== lastSentDimensions.current.cols || rows !== lastSentDimensions.current.rows) {
                      console.log(`📏 FullscreenTerminal received resize: ${cols}x${rows}`)
                      lastSentDimensions.current = { cols, rows }
                      
                      if (socket) {
                        console.log(`📤 Sending resize to server: ${cols}x${rows}`)
                        socket.emit('resize', { cols, rows })
                      }
                    }
                  }}
                  onCommandDetected={(command: string) => {
                    // Track commands for smart suggestions
                    console.log(`🎯 Command detected: ${command}`)
                    setOutput(prev => [...prev, `> ${command}`])
                    
                    // 📊 Track command for documentation
                    if (sessionTracker.isTracking()) {
                      sessionTracker.startCommand(command)
                    }
                  }}
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* AI Agent - Now a flex sibling instead of overlay - ENHANCED with bidirectional sync */}
          {isAgentOpen && (
            <AIAgent 
              isOpen={isAgentOpen}
              onToggle={() => {
                setIsAgentOpen(!isAgentOpen)
                // Re-fit terminal when agent closes
                setTimeout(() => {
                  if (xtermRef.current) {
                    xtermRef.current.resize()
                    console.log('🔄 Terminal resized due to agent toggle')
                  }
                }, 350)
              }}
              onWidthChange={(width: number) => {
                console.log(`📏 Agent width changed to: ${width}px`)
                // Re-fit terminal immediately during drag
                if (xtermRef.current) {
                  xtermRef.current.resize()
                }
              }}
              terminalOutput={output}
              onCodeInsert={handleCodeInsert}
              sshSocket={socket}
              sessionId={sessionId}
              onCommandPropose={async (command: string, explanation: string) => {
                // Execute command with typing animation
                if (socket && isShellReady) {
                  console.log(`🤖 Agent executing command with typing animation: ${command}`)
                  console.log(`💡 Explanation: ${explanation}`)
                  try {
                    await executeCommandWithTyping(command, explanation)
                  } catch (error) {
                    console.error('❌ Command execution failed:', error)
                  }
                } else {
                  console.warn('⚠️ Cannot execute command - SSH not ready')
                  console.warn(`   Socket: ${socket ? 'Connected' : 'Disconnected'}`)
                  console.warn(`   Shell: ${isShellReady ? 'Ready' : 'Not Ready'}`)
                  throw new Error('SSH not connected. Please connect SSH first.')
                }
              }}
              terminalState={{
                isConnected,
                isShellReady,
                currentPath,
                currentUser: sshCredentials.username,
                currentHost: sshCredentials.host,
                connectionStatus
              }}
              onTerminalCommand={async (command: string) => {
                // Alternative method for command execution
                if (socket && isShellReady) {
                  await executeCommandWithTyping(command)
                } else {
                  throw new Error('SSH not connected')
                }
              }}
            />
          )}
        </motion.div>

        {/* NEW: Session Choice Modal - Choose existing or create new */}
        <SessionChoiceModal
          isOpen={showSessionChoice}
          existingSessions={existingSessions}
          onUseExisting={(sessionId) => {
            // Reuse existing session from another tab
            const session = existingSessions.find(s => s.sessionId === sessionId)
            if (!session) return
            
            console.log(`🔗 User chose to reuse session from another tab: ${session.sessionId}`)
            
            setSessionId(session.sessionId)
            setIsConnected(true)
            setConnectionStatus('connected')
            setSshCredentials({
              host: session.host,
              username: session.username,
              password: '',
              keyContent: '',
              passphrase: '',
              useKey: false
            })
            setShowSessionChoice(false)
            
            // Connect WebSocket to existing session
            const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
              transports: ['websocket', 'polling'],
              forceNew: true,
              timeout: 20000
            })

            newSocket.on('connect', () => {
              console.log('🔌 WebSocket connected to shared session')
              setOutput(prev => [...prev, '🔌 Connecting to shared SSH session...'])
              newSocket.emit('auth', { sessionId: session.sessionId })
            })

            newSocket.on('ready', () => {
              console.log('✅ Shared session ready')
              setIsShellReady(true)
              setOutput(prev => [...prev, `✅ Connected to shared session: ${session.username}@${session.host}`])
              setOutput(prev => [...prev, '💡 Terminal output is synced with other tab'])
            })

            newSocket.on('output', (data: string) => {
              setOutput(prev => [...prev, data])
            })

            newSocket.on('error', (error: any) => {
              console.error('❌ Shared session error:', error)
              setOutput(prev => [...prev, `❌ Error: ${error.message || error}`])
            })

            setSocket(newSocket)
            
            // Register this tab's use of the session
            multiTabSessionManager.registerSession(session.sessionId, session.host, session.username)
          }}
          onCreateNew={() => {
            console.log('➕ User chose to create new SSH connection')
            setShowSessionChoice(false)
            setTimeout(() => {
              setShowSSHModal(true)
            }, 300)
          }}
          onClose={() => {
            setShowSessionChoice(false)
            setShowSSHModal(true)
          }}
        />

        {/* SSH Connection Modal - Rewritten Component */}
        <SSHConnectionModal
          isOpen={showSSHModal}
          onClose={() => setShowSSHModal(false)}
          onConnect={async (credentials) => {
            setSshCredentials(credentials)
            await handleSSHConnect()
          }}
          initialCredentials={{
            host: sshCredentials.host,
            username: sshCredentials.username
          }}
          connectionStatus={connectionStatus}
        />
      </motion.div>
    </AnimatePresence>
  )
} 