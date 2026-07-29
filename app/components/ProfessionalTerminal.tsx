'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X, Settings, Home, Bot } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import XTermTerminal, { XTermTerminalRef } from './XTermTerminal'
import AIAgent from './AIAgent'
import SSHHistory from './SSHHistory'
import SSHConnectionModal from './SSHConnectionModal'
import SessionChoiceModal from './SessionChoiceModal'
import { sessionTracker } from '../lib/terminal-session-tracker'
import { multiTabSessionManager } from '../lib/multi-tab-session-manager'

interface ProfessionalTerminalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfessionalTerminal({ isOpen, onClose }: ProfessionalTerminalProps) {
  const [isConnected, setIsConnected] = useState(false)
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
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isShellReady, setIsShellReady] = useState(false)
  
  // XTerm terminal reference
  const terminalRef = useRef<XTermTerminalRef>(null)

  // Auto-open SSH modal when terminal opens - with multi-tab session detection
  useEffect(() => {
    if (isOpen && !isConnected) {
      // Check if other tabs have active SSH sessions
      const otherSessions = multiTabSessionManager.getOtherTabSessions()
      
      if (otherSessions.length > 0) {
        console.log(`📊 Found ${otherSessions.length} active SSH session(s) in other tab(s)`)
        setExistingSessions(otherSessions)
        setTimeout(() => {
          setShowSessionChoice(true)
        }, 500)
      } else {
        // No existing sessions, show SSH modal
        setTimeout(() => {
          setShowSSHModal(true)
        }, 500)
      }
    }
  }, [isOpen, isConnected])

  // Handle SSH connection
  const handleSSHConnect = async () => {
    setConnectionStatus('connecting')
    terminalRef.current?.writeln(`🔐 Connecting to ${sshCredentials.username}@${sshCredentials.host}...`)

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
        setSessionId(result.sessionId)
        
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
          console.log('🔐 SSH credentials saved for auto-reconnect (10-minute retry window)')
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
        
        terminalRef.current?.writeln(`✅ Connected to ${sshCredentials.host}`)
        terminalRef.current?.writeln(`🌐 Session established as ${sshCredentials.username}`)
        terminalRef.current?.writeln(`🔐 Authentication: ${result.authMethod}`)
        if (result.serverInfo?.authUsed) {
          terminalRef.current?.writeln(`📋 ${result.serverInfo.authUsed}`)
        }
        if (result.serverInfo?.warning) {
          terminalRef.current?.writeln(`⚠️ ${result.serverInfo.warning}`)
        }
        terminalRef.current?.writeln('')
        terminalRef.current?.writeln('🔌 Establishing real-time shell connection...')

        // Establish WebSocket connection for real-time terminal
        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
          transports: ['websocket', 'polling']
        })

        newSocket.on('connect', () => {
          console.log('🔌 WebSocket connected')
          terminalRef.current?.writeln('🔌 Real-time connection established')
          newSocket.emit('auth', { sessionId: result.sessionId })
        })

        newSocket.on('ready', () => {
          console.log('✅ SSH shell ready')
          setIsShellReady(true)
          terminalRef.current?.writeln('')
          // Don't write prompt - let the SSH server provide it naturally
        })

        newSocket.on('shell-closed', () => {
          setIsConnected(false)
          setIsShellReady(false)
          terminalRef.current?.writeln('')
          terminalRef.current?.writeln('🔌 SSH connection closed')
        })

        newSocket.on('error', (error: any) => {
          console.error('❌ WebSocket error:', error)
          const message = typeof error === 'string' ? error : error?.message || 'Connection error'
          terminalRef.current?.writeln(`❌ Connection error: ${message}`)
        })

        setSocket(newSocket)
      } else {
        setConnectionStatus('error')
        terminalRef.current?.writeln(`❌ Connection failed: ${result.message}`)
        setTimeout(() => setConnectionStatus('idle'), 3000)
      }
    } catch (error) {
      setConnectionStatus('error')
      terminalRef.current?.writeln('❌ Connection error: Network unreachable')
      setTimeout(() => setConnectionStatus('idle'), 3000)
    }
  }

  // Handle terminal input from XTerm
  const handleTerminalData = (data: string) => {
    if (!socket || !isShellReady) {
      terminalRef.current?.writeln('❌ SSH Error: Shell not ready')
      terminalRef.current?.writeln('💡 Please wait for shell connection to be established')
      return
    }

    // Send input directly to SSH shell via WebSocket
    socket.emit('input', data)
  }

  // Handle terminal resize
  const handleTerminalResize = (cols: number, rows: number) => {
    if (socket && isShellReady) {
      socket.emit('resize', { cols, rows })
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50"
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
          className="w-full h-full bg-gray-900 overflow-hidden flex"
        >
          {/* Terminal Section */}
          <div className={`flex flex-col transition-all duration-300 ${isAgentOpen ? 'flex-1' : 'w-full'}`}>
            {/* Terminal Header */}
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-gray-300 text-sm ml-2">
                  {isConnected ? `${sshCredentials.username}@${sshCredentials.host}` : 'Latenite AI Terminal'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
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
                  <span className="hidden sm:inline">SSH</span>
                </button>
                
                {/* Home Link */}
                <Link href="/" className="text-gray-400 hover:text-white flex items-center space-x-1">
                  <Home className="w-4 h-4" />
                </Link>
                
                {/* SSH History */}
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

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* XTerm Terminal */}
            <div className="flex-1 relative">
              <XTermTerminal
                ref={terminalRef}
                socket={socket}
                onData={handleTerminalData}
                onResize={handleTerminalResize}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* AI Agent */}
          {isAgentOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '400px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-700 bg-gray-800"
            >
              <AIAgent 
                isOpen={isAgentOpen}
                onToggle={() => setIsAgentOpen(false)}
                terminalOutput={[]} // ✅ Agent gets full context via WebSocket agent:output events
                onCodeInsert={(code) => {
                  // Insert code into XTerm terminal
                  terminalRef.current?.write(code)
                }}
                sshSocket={socket}
                sessionId={sessionId}
                onCommandPropose={async (command: string, explanation: string) => {
                  // Execute command through SSH
                  if (socket && isShellReady) {
                    console.log(`🤖 Agent executing command: ${command}`)
                    console.log(`💡 Explanation: ${explanation}`)
                    socket.emit('input', command + '\n')
                  } else {
                    console.warn('⚠️ Cannot execute command - SSH not ready')
                    throw new Error('SSH not connected. Please connect SSH first.')
                  }
                }}
              />
            </motion.div>
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
            
            console.log(`🔗 User chose to reuse session: ${session.sessionId}`)
            
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
              forceNew: true
            })

            newSocket.on('connect', () => {
              console.log('🔌 WebSocket connected to shared session')
              terminalRef.current?.writeln('🔌 Connecting to shared SSH session...')
              newSocket.emit('auth', { sessionId: session.sessionId })
            })

            newSocket.on('ready', () => {
              console.log('✅ Shared session ready')
              setIsShellReady(true)
              terminalRef.current?.writeln(`✅ Connected to shared session: ${session.username}@${session.host}`)
              terminalRef.current?.writeln('💡 Terminal output is synced with other tab')
            })

            newSocket.on('output', (data: string) => {
              terminalRef.current?.write(data)
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
