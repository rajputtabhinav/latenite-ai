'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Monitor, Layers, X, Bot, Home, Plus, Minus } from 'lucide-react'
import Link from 'next/link'
import { io, Socket } from 'socket.io-client'
import ProfessionalTerminal from '../components/ProfessionalTerminal'
import FullscreenTerminal from '../components/FullscreenTerminal'
import XTermTerminal from '../components/XTerminalLoader'
import SSHHistory from '../components/SSHHistory'
import { TerminalColoredText } from '../lib/terminal-colors'
import TerminalCommandProposal from '../components/TerminalCommandProposal'
import AIAgent from '../components/AIAgent'
import { sharedTerminalState, SharedTerminalState } from '../lib/shared-terminal-state'
import { agentTerminalBridge, AgentTerminalBridge } from '../lib/agent-terminal-bridge'
import { commandQueueManager, CommandQueueManager } from '../lib/command-queue-manager'

// Force dynamic rendering for WebSocket and client-side features
export const dynamic = 'force-dynamic'

export default function TerminalPage() {
  // Terminal state with proper SSH connection initialization
  const [output, setOutput] = useState<string[]>([
    '🔥 Latenite AI Terminal - Real Command Execution',
    'Type "help" for available commands and features.',
    ''
  ])
  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentPath, setCurrentPath] = useState('~')
  
  // SSH connection state - properly initialized
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'>('idle')
  const [sessionId, setSessionId] = useState<string>('')
  const [showSSHModal, setShowSSHModal] = useState(false)
  const [sshCredentials, setSSHCredentials] = useState({
    host: '',
    username: '',
    password: '',
    useKey: false,
    keyContent: '',
    passphrase: ''
  })
  
  // WebSocket state for real-time SSH communication
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isShellReady, setIsShellReady] = useState(false)
  
  // AI features state
  const [showCompletions, setShowCompletions] = useState(false)
  const [completions, setCompletions] = useState<string[]>([])
  const [selectedCompletion, setSelectedCompletion] = useState(0)
  const [showInlineEdit, setShowInlineEdit] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [recentCommands, setRecentCommands] = useState<string[]>([])
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [isAgentOpen, setIsAgentOpen] = useState(false)
  const [agentWidth, setAgentWidth] = useState(0)
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false)
  
  // Enhanced synchronization state
  const [terminalState, setTerminalState] = useState(sharedTerminalState.getState())
  const [bridgeStatus, setBridgeStatus] = useState<any>(null)
  const [queueStats, setQueueStats] = useState<any>(null)
  
  // Command proposal state
  const [pendingCommand, setPendingCommand] = useState<{command: string, explanation: string} | null>(null)
  const [showCommandProposal, setShowCommandProposal] = useState(false)
  const [useXTerminal, setUseXTerminal] = useState(true) // Use XTerm.js by default
  
  // Terminal styling state
  const [fontSize, setFontSize] = useState(16) // Modern default size
  const [fontFamily, setFontFamily] = useState('"Cascadia Code", "JetBrains Mono", "Fira Code", "SF Mono", consolas, monospace')
  
  // Session persistence
  const [sessionData, setSessionData] = useState<{
    output: string[]
    sshCredentials: any
    sessionId: string
    isConnected: boolean
    currentPath: string
  } | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const xTermRef = useRef<any>(null)
  
  // Focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Enhanced WebSocket cleanup with synchronization systems
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect()
      }
      
      // Clean up synchronization systems
      sharedTerminalState.reset()
    }
  }, [socket])

  // Initialize synchronization systems
  useEffect(() => {
    // Subscribe to shared terminal state changes
    const unsubscribeState = sharedTerminalState.onStateChange((newState, changes) => {
      setTerminalState(newState)
      
      // Update local terminal state based on shared state
      if (changes.currentPath) setCurrentPath(changes.currentPath)
      if (changes.isConnected !== undefined) setIsConnected(changes.isConnected)
      if (changes.connectionStatus) setConnectionStatus(changes.connectionStatus)
    })

    // Update stats periodically
    const statsInterval = setInterval(() => {
      try {
        setBridgeStatus(agentTerminalBridge.getBridgeStatus())
        setQueueStats(commandQueueManager.getQueueStats())
      } catch (error) {
        console.log('Stats update error (expected during initialization):', error)
      }
    }, 5000)

    return () => {
      unsubscribeState()
      clearInterval(statsInterval)
    }
  }, [])

  // Initialize bridge when socket connects
  useEffect(() => {
    if (socket && sessionId) {
      try {
        // Initialize agent-terminal bridge
        agentTerminalBridge.initialize(socket)
        commandQueueManager.initialize(socket)
        
        // Update shared state with connection info
        sharedTerminalState.updateState({
          isConnected: true,
          sessionId: sessionId,
          connectionStatus: 'connected'
        })
        
        console.log('🔗 Terminal synchronization systems initialized')
      } catch (error) {
        console.log('Bridge initialization error (will retry):', error)
      }
    }
  }, [socket, sessionId])
  
  // Validate SSH connection state on each render
  useEffect(() => {
    // If we think we're connected but don't have a sessionId, reset state
    if (isConnected && !sessionId) {
      console.log('Detected invalid SSH state - resetting connection status')
      setIsConnected(false)
      setConnectionStatus('idle')
    }
  }, [isConnected, sessionId])

  useEffect(() => {
    // Load persisted session data on page load
    const savedSession = localStorage.getItem('latenite-terminal-session')
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession)
        setOutput(parsedSession.output || ['🔥 Latenite AI Terminal - Real Command Execution', 'Type "help" for available commands and features.', ''])
        if (parsedSession.sshCredentials) {
          setSSHCredentials(parsedSession.sshCredentials)
        }
        if (parsedSession.currentPath) {
          setCurrentPath(parsedSession.currentPath)
        }
        setIsConnected(parsedSession.isConnected || false)
        setSessionId(parsedSession.sessionId || '')
        
        console.log('📂 Restored terminal session from localStorage')
      } catch (error) {
        console.error('Failed to restore session:', error)
      }
    }
    
    // Auto-open SSH modal when page loads (only if not connected)
    setTimeout(() => {
      if (!isConnected) {
        setShowSSHModal(true)
      }
    }, 1000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save session data whenever important state changes
  useEffect(() => {
    const sessionData = {
      output,
      sshCredentials,
      sessionId,
      isConnected,
      currentPath,
      lastUpdated: Date.now()
    }
    
    localStorage.setItem('latenite-terminal-session', JSON.stringify(sessionData))
  }, [output, sshCredentials, sessionId, isConnected, currentPath])

  // Enhanced auto-scrolling with intelligent behavior
  useEffect(() => {
    const scrollToBottom = () => {
      if (terminalRef.current) {
        const terminal = terminalRef.current
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

  // Additional scroll behavior for command proposals
  useEffect(() => {
    if (showCommandProposal && terminalRef.current) {
      const terminal = terminalRef.current
      // Always scroll to bottom when showing command proposals
      setTimeout(() => {
        terminal.scrollTo({
          top: terminal.scrollHeight,
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [showCommandProposal])

  const handleAgentWidthChange = (width: number) => {
    setAgentWidth(width)
    console.log(`📏 Agent width changed: ${width}px`)
    // Re-fit terminal after agent width changes
    setTimeout(() => {
      if (xTermRef.current) {
        xTermRef.current.resize()
        console.log('🔄 Terminal resized due to agent width change')
      }
    }, 100)
  }

  const handleRunDiagnostics = async () => {
    if (!sshCredentials.host || !sshCredentials.username) {
      setOutput(prev => [...prev, '❌ Please enter host and username before running diagnostics'])
      return
    }

    setIsDiagnosticRunning(true)
    setOutput(prev => [...prev, `🔍 Running SSH diagnostics for ${sshCredentials.username}@${sshCredentials.host}...`])

    try {
      const { SSHConnectionHandler } = await import('../lib/ssh-connection-handler')
      
      const result = await SSHConnectionHandler.testConnection({
        host: sshCredentials.host,
        username: sshCredentials.username,
        useKey: sshCredentials.useKey,
        password: sshCredentials.useKey ? undefined : sshCredentials.password,
        keyContent: sshCredentials.useKey ? sshCredentials.keyContent : undefined,
        passphrase: sshCredentials.passphrase
      })

      let diagnosticMessages = ['', '📋 Diagnostic Results:']
      
      if (result.diagnostics && result.diagnostics.length > 0) {
        result.diagnostics.forEach(diag => {
          const icon = diag.status === 'pass' ? '✅' : diag.status === 'warning' ? '⚠️' : '❌'
          const duration = diag.duration ? ` (${diag.duration}ms)` : ''
          diagnosticMessages.push(`${icon} ${diag.test}: ${diag.message}${duration}`)
          
          if (diag.details) {
            diagnosticMessages.push(`   Details: ${diag.details}`)
          }
        })
      }

      if (result.suggestions && result.suggestions.length > 0) {
        diagnosticMessages.push('', '💡 Recommendations:')
        result.suggestions.forEach(suggestion => {
          diagnosticMessages.push(`• ${suggestion}`)
        })
      }

      diagnosticMessages.push('', `📊 Overall Status: ${result.success ? '✅ Ready to connect' : '❌ Issues detected'}`)
      setOutput(prev => [...prev, ...diagnosticMessages])

    } catch (error: any) {
      setOutput(prev => [...prev, `❌ Diagnostic error: ${error.message}`])
    } finally {
      setIsDiagnosticRunning(false)
    }
  }

  const handleSSHConnect = async () => {
    setConnectionStatus('connecting')
    setOutput(prev => [...prev, `🔐 Connecting to ${sshCredentials.username}@${sshCredentials.host}...`])

    try {
      // Use enhanced connection handler with diagnostics
      const { SSHConnectionHandler } = await import('../lib/ssh-connection-handler')
      
      const result = await SSHConnectionHandler.connectWithDiagnostics({
        host: sshCredentials.host,
        username: sshCredentials.username,
        useKey: sshCredentials.useKey,
        password: sshCredentials.useKey ? undefined : sshCredentials.password,
        keyContent: sshCredentials.useKey ? sshCredentials.keyContent : undefined,
        passphrase: sshCredentials.passphrase
      }, true) // Run diagnostics

      if (result.success) {
        setIsConnected(true)
        setConnectionStatus('connected')
        setShowSSHModal(false)
        setSessionId(result.sessionId || '')
        
        // Add to SSH history
        if ((window as any).sshHistory?.addConnection) {
          (window as any).sshHistory.addConnection(sshCredentials.host, sshCredentials.username)
        }
        
        let connectionMessages = [
          `✅ Connected to ${sshCredentials.host}`,
          `🌐 Session established as ${sshCredentials.username}`,
          `🔐 Authentication: ${result.authMethod || 'Successful'}`,
          result.serverInfo?.authUsed ? `📋 ${result.serverInfo.authUsed}` : '',
          result.serverInfo?.warning ? `⚠️ ${result.serverInfo.warning}` : '',
        ]
        
        // Add diagnostic results if available
        if (result.diagnostics && result.diagnostics.length > 0) {
          connectionMessages.push('', '🔍 Connection Diagnostics:')
          result.diagnostics.forEach(diag => {
            const icon = diag.status === 'pass' ? '✅' : diag.status === 'warning' ? '⚠️' : '❌'
            connectionMessages.push(`${icon} ${diag.test}: ${diag.message}`)
          })
        }
        
        connectionMessages.push('', '🔌 Establishing real-time shell connection...')
        setOutput(prev => [...prev, ...connectionMessages])

        // Establish WebSocket connection for real-time terminal
        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000
        })

        newSocket.on('connect', () => {
          console.log('🔌 WebSocket connected with ID:', newSocket.id)
          if (useXTerminal && xTermRef.current) {
            xTermRef.current.write('\x1b[96m🔌 Real-time connection established\x1b[0m\r\n')
          } else {
            setOutput(prev => [...prev, '🔌 Real-time connection established'])
          }
          
          // FIX: Add delay to ensure session is stored on server
          setTimeout(() => {
            console.log('🔐 Authenticating with session:', result.sessionId)
            newSocket.emit('auth', { sessionId: result.sessionId })
          }, 500)
        })

        newSocket.on('ready', (data) => {
          console.log('✅ SSH shell ready via WebSocket')
          setIsShellReady(true)
          
          // Update shared state for agent
          sharedTerminalState.updateState({
            isShellReady: true,
            connectionStatus: 'connected'
          })
          
          if (useXTerminal && xTermRef.current) {
            xTermRef.current.write('\x1b[92mSSH shell ready - XTerm.js terminal active\x1b[0m\r\n')
          } else {
            setOutput(prev => [...prev, `Ready! You can now execute commands.`, ''])
          }
        })

        // ENHANCED: Output handler with perfect agent synchronization
        newSocket.on('output', (data) => {
          // Stream real-time output from SSH server
          const outputString = data.toString()
          
          // If using XTerm.js, write directly to it
          if (useXTerminal && xTermRef.current) {
            xTermRef.current.write(outputString)
          }
          
          // Always update HTML terminal for agent compatibility
          setOutput(prev => {
            const newOutput = [...prev, outputString]
            
            // ENHANCED: Process output through agent-terminal bridge
            try {
              agentTerminalBridge.processTerminalOutput(outputString)
            } catch (error) {
              // Bridge may not be fully initialized yet
              console.log('Bridge processing skipped (not ready):', error)
            }
            
            // ENHANCED: Update shared terminal state
            const outputMetadata = {
              timestamp: new Date(),
              source: 'ssh' as const,
              isError: /error|failed|permission denied/i.test(outputString),
              isComplete: /([^@\s]+@[^:]+:[^$#]+[$#])\s*$/.test(outputString)
            }
            
            sharedTerminalState.processOutput(outputString, outputMetadata)
            
            // Legacy agent notification (keep for compatibility)
            if ((window as any).terminalAgent) {
              (window as any).terminalAgent.onTerminalOutputReceived(outputString)
            }
            
            return newOutput
          })
          
          // Parse prompt changes for user switching (enhanced)
          const promptMatch = outputString.match(/([^@\s]+)@([^:]+):([^$#]+)([$#])\s*$/)
          if (promptMatch) {
            const [, user, host, path, promptChar] = promptMatch
            
            // Update shared state
            sharedTerminalState.updateState({
              currentPath: path,
              currentUser: user,
              currentHost: host,
              permissions: {
                ...terminalState.permissions,
                hasRoot: promptChar === '#'
              }
            })
            
            // Update local state
            setCurrentPath(path)
            
            // Update SSH credentials to reflect current user
            if (user !== sshCredentials.username) {
              setSSHCredentials(prev => ({ ...prev, username: user }))
              console.log(`👤 User switched to: ${user} (${promptChar === '#' ? 'root' : 'user'})`)
            }
          }
        })

        // NEW: Enhanced agent output handler
        newSocket.on('agent:output', ({ output, metadata, commandId }) => {
          console.log(`🤖 Agent received output for command ${commandId}:`, output.substring(0, 100))
          
          // This gives the agent real-time access to command output
          // The agent can now see exactly what's happening in the terminal
        })

        // NEW: Command completion handler
        newSocket.on('command:complete', ({ commandId, command, success, duration }) => {
          console.log(`✅ Command completion: ${command} (${success ? 'SUCCESS' : 'FAILED'}) - ${duration}ms`)
          
          // Update shared state
          sharedTerminalState.markCommandComplete(command, success, undefined, success ? undefined : 'Command failed')
        })

        // NEW: Command sent confirmation
        newSocket.on('command:sent', ({ commandId, command, source }) => {
          console.log(`📤 Command sent confirmation: ${command} from ${source} (ID: ${commandId})`)
        })

        newSocket.on('shell-closed', () => {
          console.log('🔌 SSH shell closed')
          setIsConnected(false)
          setIsShellReady(false)
          setOutput(prev => [...prev, '', '🔌 SSH connection closed'])
        })

        newSocket.on('error', (error) => {
          console.error('❌ WebSocket error:', error)
          const errorMessage = error?.message || JSON.stringify(error) || 'Unknown WebSocket error'
          
          if (useXTerminal && xTermRef.current) {
            xTermRef.current.write(`\x1b[91m❌ SSH Error: ${errorMessage}\x1b[0m\r\n`)
          } else {
            setOutput(prev => [...prev, `❌ Connection error: ${errorMessage}`])
          }
          
          // If session not found, try to reconnect
          if (errorMessage.includes('Session not found') || errorMessage.includes('disconnected')) {
            console.log('🔄 Session lost, attempting to reconnect...')
            setTimeout(() => {
              setIsConnected(false)
              setIsShellReady(false)
              // Reset connection status to allow reconnection
              setConnectionStatus('idle')
            }, 2000)
          }
        })

        setSocket(newSocket)
      } else {
        setConnectionStatus('error')
        
        let errorMessages = [`❌ Connection failed: ${result.message}`]
        
        // Add diagnostic information if available
        if (result.diagnostics && result.diagnostics.length > 0) {
          errorMessages.push('', '🔍 Diagnostic Results:')
          result.diagnostics.forEach(diag => {
            const icon = diag.status === 'pass' ? '✅' : diag.status === 'warning' ? '⚠️' : '❌'
            errorMessages.push(`${icon} ${diag.test}: ${diag.message}`)
          })
        }
        
        // Add suggestions if available
        if (result.suggestions && result.suggestions.length > 0) {
          errorMessages.push('', '💡 Suggestions:')
          result.suggestions.forEach(suggestion => {
            errorMessages.push(`• ${suggestion}`)
          })
        }
        
        errorMessages.push('', '🔄 Click "Connect SSH" to try again or check your credentials')
        setOutput(prev => [...prev, ...errorMessages])
        setTimeout(() => setConnectionStatus('idle'), 5000)
      }
    } catch (error: any) {
      setConnectionStatus('error')
      
      const errorMessages = [
        `❌ Connection error: ${error.message || 'Network unreachable'}`,
        '',
        '💡 Troubleshooting steps:',
        '• Check your internet connection',
        '• Verify the host address and credentials',
        '• Ensure the SSH server is running on the target host',
        '• Check firewall settings',
        '',
        '🔄 Try again or run diagnostics'
      ]
      
      setOutput(prev => [...prev, ...errorMessages])
      setTimeout(() => setConnectionStatus('idle'), 5000)
    }
  }

  // ENHANCED: Coordinated command execution with perfect agent sync
  const executeCommand = async (command: string, source: 'user' | 'agent' = 'user') => {
    if (!command.trim()) return

    // Add to command history and recent commands
    setCommandHistory(prev => [...prev, command])
    setRecentCommands(prev => [...prev.slice(-9), command])
    setHistoryIndex(-1)

    const prompt = isConnected ? `${sshCredentials.username}@${sshCredentials.host}` : 'abhinav@latenite'
    setOutput(prev => [...prev, `${prompt}:${currentPath}$ ${command}`])
    
    if (!isConnected) {
      // Local commands (unchanged)
      switch (command.toLowerCase()) {
        case 'help':
          setOutput(prev => [...prev,
            '🔥 Latenite AI Terminal - Real Command Execution with Agent Sync',
            '',
            '🔐 SSH Connection:',
            '  • Click "Connect SSH" to connect to remote servers',
            '  • Supports password and SSH key authentication',  
            '  • Real command execution with AI agent integration',
            '',
            '🤖 Agent Features:',
            `  • Agent Connected: ${terminalState.agentConnected ? '✅' : '❌'}`,
            `  • Autonomous Mode: ${terminalState.autonomousMode ? '✅' : '❌'}`,
            `  • Queue Length: ${terminalState.commandQueue.length}`,
            '',
            '🚀 Perfect agent-terminal synchronization active!',
            ''
          ])
          break
        case 'clear':
          setOutput([])
          return
        case 'queue':
          // NEW: Show command queue status
          const stats = commandQueueManager.getQueueStats()
          setOutput(prev => [...prev,
            '📋 Command Queue Status:',
            `  • Pending: ${stats.pending}`,
            `  • Executing: ${stats.executing}`,
            `  • Completed: ${stats.completed}`,
            `  • Failed: ${stats.failed}`,
            `  • Average Time: ${stats.averageTime}ms`,
            `  • Throughput: ${stats.throughput} commands/min`,
            `  • Error Rate: ${stats.errorRate}%`,
            ''
          ])
          break
        case 'bridge':
          // NEW: Show bridge status
          try {
            const bridgeStatus = agentTerminalBridge.getBridgeStatus()
            const bridgeStats = agentTerminalBridge.getBridgeStats?.() || {}
            setOutput(prev => [...prev,
              '🌉 Agent-Terminal Bridge Status:',
              `  • Initialized: ${bridgeStatus.initialized ? '✅' : '❌'}`,
              `  • Socket Connected: ${bridgeStatus.socketConnected ? '✅' : '❌'}`,
              `  • Active Commands: ${bridgeStatus.activeCommands}`,
              `  • Queue Length: ${bridgeStatus.queueLength}`,
              `  • Agent Connected: ${bridgeStatus.agentConnected ? '✅' : '❌'}`,
              `  • Sync Efficiency: ${bridgeStats.syncEfficiency || 'N/A'}%`,
              ''
            ])
          } catch (error) {
            setOutput(prev => [...prev,
              '🌉 Agent-Terminal Bridge Status:',
              `  • Status: Initializing...`,
              `  • Bridge will be ready after SSH connection`,
              ''
            ])
          }
          break
        default:
          setOutput(prev => [...prev, 
            `Command '${command}' not recognized.`,
            'Type "help" for available features, "queue" for queue status, "bridge" for sync status.',
            ''
          ])
          break
      }
    } else {
      // ENHANCED: SSH commands with perfect agent coordination
      if (!socket || !isShellReady) {
        setOutput(prev => [...prev, 
          `❌ SSH Error: Shell not ready`,
          `💡 Please wait for shell connection to be established`,
          `🔐 Real-time SSH session required for command execution`,
          `🌉 Bridge Status: ${bridgeStatus?.initialized ? 'Ready' : 'Initializing'}`,
          ''
        ])
        return
      }

      try {
        // ENHANCED: Use coordinated command execution through bridge
        if (source === 'agent') {
          // Agent commands go through bridge for coordination
          console.log(`🤖 Agent command via bridge: ${command}`)
          try {
            await agentTerminalBridge.sendAgentCommand(command)
          } catch (error) {
            console.log('Bridge not ready, using direct execution:', error)
            socket.emit('input', command + '\n')
          }
        } else {
          // User commands go through queue manager for coordination  
          console.log(`👤 User command via coordination: ${command}`)
          try {
            commandQueueManager.enqueueCommand(command, 'user')
          } catch (error) {
            console.log('Queue not ready, using direct execution:', error)
            socket.emit('input', command + '\n')
          }
        }
        
      } catch (error) {
        console.error('❌ Coordinated execution failed:', error)
        
        // Fallback to direct execution
        console.log('🔄 Falling back to direct WebSocket execution')
        socket.emit('input', command + '\n')
      }
      
      return
    }

    setOutput(prev => [...prev, `${prompt}:${currentPath}$ `])
  }

  const handleCodeInsert = (code: string) => {
    setInput(code)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Command proposal handlers
  const showCommandProposalInTerminal = async (command: string, explanation: string): Promise<void> => {
    // FIX: Check if command is from autonomous agent
    if (explanation.includes('[AUTONOMOUS]') || terminalState?.autonomousMode) {
      // Auto-approve and execute immediately without showing modal
      if (socket && isShellReady) {
        const prompt = isConnected ? `${sshCredentials.username}@${sshCredentials.host}` : 'abhinav@latenite'
        setOutput(prev => [...prev, `${prompt}:${currentPath}$ ${command}`])
        socket.emit('input', command + '\n')
        console.log(`[Autopilot] Auto-executed command: ${command}`)
      }
      return
    }
    
    // Show approval modal for manual commands
    setPendingCommand({ command, explanation })
    setShowCommandProposal(true)
    setOutput(prev => [...prev, '']) // Add spacing
  }

  const approveCommand = () => {
    if (pendingCommand && socket && isShellReady) {
      setShowCommandProposal(false)
      const prompt = isConnected ? `${sshCredentials.username}@${sshCredentials.host}` : 'abhinav@latenite'
      
      // Show approved command in output
      setOutput(prev => [...prev, `${prompt}:${currentPath}$ ${pendingCommand.command}`])
      
      // Execute via WebSocket
      socket.emit('input', pendingCommand.command + '\n')
      
      setPendingCommand(null)
    }
  }

  const rejectCommand = () => {
    if (pendingCommand) {
      setShowCommandProposal(false)
      setOutput(prev => [...prev, `🤖 Command rejected: ${pendingCommand.command}`, ''])
      setPendingCommand(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Handle command proposal shortcuts
    if (showCommandProposal) {
      if (e.key === 'Enter') {
        e.preventDefault()
        approveCommand()
        return
      } else if (e.key === 'Escape') {
        e.preventDefault()
        rejectCommand()
        return
      }
    }

    // Enter to execute normal commands
    if (e.key === 'Enter') {
      executeCommand(input)
      setInput('')
      return
    }
    
    // Command history navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
      return
    }
    
    // Handle Ctrl+C (interrupt)
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault()
      if (socket && isShellReady) {
        socket.emit('input', '\x03') // Send Ctrl+C to SSH
      }
      return
    }
    
    // Handle Ctrl+L (clear screen)
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault()
      setOutput([])
      return
    }
  }

  return (
    <div className="min-h-screen w-screen bg-black overflow-auto flex">
      {/* Terminal Section */}
      <div 
        className="flex flex-col transition-all duration-300 flex-1 min-h-screen relative"
        style={{ 
          width: agentWidth > 0 ? `calc(100vw - ${agentWidth}px)` : '100vw'
        }}
      >
        {/* Minimal Floating Control Bar - Modern Centered Design */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-full px-4 py-2 shadow-2xl flex items-center space-x-2"
          >
            {/* Agent Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAgentOpen(!isAgentOpen)}
              className={`px-3 py-1.5 rounded-full text-sm flex items-center space-x-1.5 transition-all duration-200 ${
                isAgentOpen
                  ? 'bg-primary-orange text-white shadow-lg shadow-orange-500/50'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Agent</span>
            </motion.button>
            
            {/* SSH Button with Status */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSSHModal(true)}
              className={`px-3 py-1.5 rounded-full text-sm flex items-center space-x-1.5 shadow-lg transition-all duration-200 ${
                isConnected 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/50' 
                  : 'bg-primary-orange hover:bg-orange-600 text-white shadow-orange-500/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{isConnected ? 'SSH Connected' : 'Connect SSH'}</span>
              {isConnected && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
            </motion.button>
            
            {/* Home Link */}
            <Link href="/">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full flex items-center space-x-1.5 transition-all duration-200"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">Home</span>
              </motion.div>
            </Link>
            
            {/* Font Controls */}
            <div className="flex items-center space-x-2">
              {/* Font Size Controls */}
              <div className="flex items-center space-x-1 bg-gray-800/50 rounded-full p-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                  className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition-all duration-200"
                  title="Decrease font size"
                >
                  <Minus className="w-3 h-3" />
                </motion.button>
                
                <span className="text-xs text-gray-400 min-w-[2rem] text-center">{fontSize}px</span>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                  className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition-all duration-200"
                  title="Increase font size"
                >
                  <Plus className="w-3 h-3" />
                </motion.button>
              </div>
              
              {/* Font Family Selector */}
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="bg-gray-800/50 text-gray-300 text-xs rounded-full px-3 py-1.5 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200 outline-none"
                title="Select font family"
              >
                <option value='"Cascadia Code", "JetBrains Mono", "Fira Code", "SF Mono", consolas, monospace'>Cascadia Code</option>
                <option value='"JetBrains Mono", "Fira Code", "SF Mono", monospace'>JetBrains Mono</option>
                <option value='"Fira Code", "SF Mono", "Monaco", monospace'>Fira Code</option>
                <option value='"SF Mono", "Monaco", "Consolas", monospace'>SF Mono</option>
                <option value='"Consolas", "Courier New", monospace'>Consolas</option>
                <option value='"Hack", "Source Code Pro", monospace'>Hack</option>
              </select>
            </div>

            {/* SSH History Component */}
            <SSHHistory 
              onConnect={(connection) => {
                setSSHCredentials(prev => ({ 
                  ...prev, 
                  host: connection.host, 
                  username: connection.username 
                }))
                setShowSSHModal(true)
              }}
              currentConnection={isConnected ? { host: sshCredentials.host, username: sshCredentials.username } : null}
              isConnected={isConnected}
            />
          </motion.div>
        </div>

        {/* Terminal Content - Full Height Clean */}
        <div className="absolute inset-0 flex flex-col">
          {useXTerminal ? (
            /* XTerm.js Terminal */
            <div className="flex-1 relative">
              <XTermTerminal
                ref={xTermRef}
                socket={socket}
                fontSize={fontSize}
                fontFamily={fontFamily}
                onResize={(cols, rows) => {
                  console.log(`📏 Terminal page resize: ${cols}x${rows}`)
                  if (socket) {
                    console.log(`📤 Sending resize to SSH: ${cols}x${rows}`)
                    socket.emit('resize', { cols, rows })
                  }
                }}
                className="w-full h-full"
              />
            </div>
          ) : (
            /* Fallback HTML Terminal */
            <>
              {/* Terminal Output Area - Modern Styling */}
              <div 
                ref={terminalRef}
                className="flex-1 p-4 bg-black font-mono overflow-y-auto terminal-scrollbar"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                  lineHeight: 1.3,
                  letterSpacing: '0.5px',
                  color: '#f8fafc',
                  scrollBehavior: 'smooth',
                  minHeight: 'calc(100vh - 200px)'
                }}
              >
                {output.map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    <TerminalColoredText text={line} />
                  </div>
                ))}
                
                {/* Command Proposal Display */}
                {showCommandProposal && pendingCommand && (
                  <TerminalCommandProposal
                    command={pendingCommand.command}
                    explanation={pendingCommand.explanation}
                    onApprove={approveCommand}
                    onReject={rejectCommand}
                    prompt={isConnected ? `${sshCredentials.username}@${sshCredentials.host}` : 'abhinav@latenite'}
                  />
                )}
                
                {/* Spacer to ensure input area is always visible */}
                <div className="h-20"></div>
              </div>
              
              {/* Fixed Input Area - Modern Styling */}
              <div className="sticky bottom-0 bg-black p-4">
                <div className="flex items-center relative bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-600/30 terminal-input-glow">
                  <span 
                    className="text-cyan-400 font-semibold mr-2"
                    style={{ 
                      fontSize: `${fontSize}px`, 
                      fontFamily: fontFamily,
                      letterSpacing: '0.5px'
                    }}
                  >
                    {isConnected ? `${sshCredentials.username}@${sshCredentials.host}` : 'abhinav@latenite'}
                  </span>
                  <span 
                    className="text-blue-400 mr-1"
                    style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }}
                  >:</span>
                  <span 
                    className="text-purple-400 mr-1"
                    style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }}
                  >{currentPath}</span>
                  <span 
                    className="text-cyan-400 mr-2"
                    style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }}
                  >$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 bg-transparent text-emerald-400 outline-none placeholder-gray-500"
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily: fontFamily,
                      letterSpacing: '0.5px',
                      lineHeight: 1.3
                    }}
                    placeholder={isConnected ? "Type command..." : "Connect to SSH first"}
                    autoFocus
                  />
                  <span 
                    className="animate-pulse text-cyan-400 ml-1"
                    style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }}
                  >▊</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enhanced AI Agent with Perfect Terminal Sync */}
      <AIAgent 
        isOpen={isAgentOpen}
        onToggle={() => {
          setIsAgentOpen(!isAgentOpen)
          
          // Update shared state
          sharedTerminalState.updateState({ agentConnected: isAgentOpen })
          
          // Re-fit terminal when agent opens/closes
          setTimeout(() => {
            if (xTermRef.current) {
              xTermRef.current.resize()
              console.log('🔄 Terminal resized due to agent toggle')
            }
          }, 350) // Wait for animation
        }}
        terminalOutput={output}
        onCodeInsert={handleCodeInsert}
        onWidthChange={handleAgentWidthChange}
        sshSocket={socket}
        sessionId={sessionId}
        onCommandPropose={showCommandProposalInTerminal}
        // NEW: Enhanced terminal integration props
        terminalState={terminalState}
        bridgeStatus={bridgeStatus}
        queueStats={queueStats}
        onTerminalCommand={(cmd) => executeCommand(cmd, 'agent')}
      />

      {/* SSH Connection Modal */}
      <AnimatePresence>
        {showSSHModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && setShowSSHModal(false)}
          >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 rounded-lg p-4 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">🔐 SSH Connection</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Host</label>
                  <input
                    type="text"
                    value={sshCredentials.host}
                    onChange={(e) => setSSHCredentials(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="192.168.1.100"
                    className="w-full bg-gray-700 text-white px-2 py-1.5 text-sm rounded border border-gray-600 focus:border-primary-orange outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Username</label>
                  <input
                    type="text"
                    value={sshCredentials.username}
                    onChange={(e) => setSSHCredentials(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="root"
                    className="w-full bg-gray-700 text-white px-2 py-1.5 text-sm rounded border border-gray-600 focus:border-primary-orange outline-none"
                  />
                </div>
              </div>

              {/* Authentication Method Toggle */}
              <div className="flex space-x-1 bg-gray-800 rounded p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSSHCredentials(prev => ({ ...prev, useKey: false }))
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                    !sshCredentials.useKey 
                      ? 'bg-primary-orange text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSSHCredentials(prev => ({ ...prev, useKey: true }))
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                    sshCredentials.useKey 
                      ? 'bg-primary-orange text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  SSH Key
                </button>
              </div>
              
              {!sshCredentials.useKey ? (
                <div>
                  <input
                    type="password"
                    value={sshCredentials.password}
                    onChange={(e) => setSSHCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    className="w-full bg-gray-700 text-white px-2 py-1.5 text-sm rounded border border-gray-600 focus:border-primary-orange outline-none"
                  />
                </div>
              ) : (
                <div>
                  <textarea
                    value={sshCredentials.keyContent || ''}
                    onChange={(e) => setSSHCredentials(prev => ({ 
                      ...prev, 
                      keyContent: e.target.value 
                    }))}
                    placeholder="Paste your private key here..."
                    className="w-full bg-gray-700 text-white px-2 py-1.5 text-xs rounded border border-gray-600 focus:border-primary-orange outline-none font-mono"
                    rows={4}
                  />
                </div>
              )}
            </div>
            
            <div className="flex flex-col space-y-3 mt-6">
              {/* Diagnostic Button */}
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={
                  !sshCredentials.host || 
                  !sshCredentials.username || 
                  isDiagnosticRunning ||
                  connectionStatus === 'connecting'
                }
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-2 text-sm rounded flex items-center justify-center space-x-2"
              >
                {isDiagnosticRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Running Diagnostics...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Run Diagnostics</span>
                  </>
                )}
              </button>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSSHModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSSHConnect}
                  disabled={
                    !sshCredentials.host || 
                    !sshCredentials.username || 
                    connectionStatus === 'connecting' ||
                    isDiagnosticRunning ||
                    (sshCredentials.useKey && !sshCredentials.keyContent) ||
                    (!sshCredentials.useKey && !sshCredentials.password)
                  }
                  className="bg-primary-orange hover:bg-orange-600 disabled:bg-gray-600 text-white px-4 py-2 text-sm rounded"
                >
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}