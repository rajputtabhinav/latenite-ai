import { useState, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { agentTerminalBridge } from '../../../lib/agent-terminal-bridge'
import { autoReconnect, ReconnectProgress } from '../../../lib/ssh-auto-reconnect'
import { credentialManager } from '../../../lib/ssh-credential-manager'
import { persistConversation } from '../../../lib/agent-intelligence'
import { TerminalAgentController } from '../../../lib/terminal-agent-integration'
import type { AIMessage } from '../../../types'

interface UseAgentSocketProps {
    sshSocket: Socket | null
    sessionId: string | undefined
    messages: AIMessage[]
    setMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>
    selectedModel: string
    autoReconnectEnabled: boolean
    terminalAgent: TerminalAgentController
}

export function useAgentSocket({
    sshSocket,
    sessionId,
    messages,
    setMessages,
    selectedModel,
    autoReconnectEnabled,
    terminalAgent
}: UseAgentSocketProps) {
    const [conversationSessionId, setConversationSessionId] = useState<string | null>(null)
    const [isReconnecting, setIsReconnecting] = useState(false)
    const [reconnectProgress, setReconnectProgress] = useState<ReconnectProgress | null>(null)
    const [terminalHistory, setTerminalHistory] = useState<string[]>([])
    
    // Add refs for stable access to changing values
    const messagesRef = useRef(messages)
    const sshSocketRef = useRef(sshSocket)
    const sessionCreatedRef = useRef(false)
    
    // Keep refs updated
    messagesRef.current = messages
    sshSocketRef.current = sshSocket

    // Create conversation session on first message (with guard to prevent duplicates)
    useEffect(() => {
        if (messages.length > 0 && !conversationSessionId && sshSocket && !sessionCreatedRef.current) {
            sessionCreatedRef.current = true
            sshSocket.emit('create-conversation-session', { model: selectedModel }, (response: any) => {
                if (response.success && response.sessionId) {
                    setConversationSessionId(response.sessionId)
                    console.log(`✅ Created conversation session: ${response.sessionId}`)
                } else {
                    // Reset flag on failure to allow retry
                    sessionCreatedRef.current = false
                }
            })
        }
    }, [messages.length, conversationSessionId, sshSocket, selectedModel])

    // Initialize bridge when SSH connects
    useEffect(() => {
        if (sshSocket && sessionId) {
            try {
                agentTerminalBridge.initialize(sshSocket)
                console.log('🔗 Agent bridge initialized for command execution')
            } catch (error) {
                console.error('❌ Bridge initialization failed:', error)
            }
        }
    }, [sshSocket, sessionId])

    // Initialize terminal agent integration
    useEffect(() => {
        // Connect to SSH socket if available
        if (sshSocket && sessionId) {
            terminalAgent.connectToTerminal(sshSocket, sessionId)
        }
    }, [sshSocket, sessionId]) // terminalAgent is stable, removed from deps

    // Auto-save conversations every 10 seconds (using refs to avoid recreating interval)
    useEffect(() => {
        if (!sessionId || messagesRef.current.length === 0) return

        const saveInterval = setInterval(() => {
            persistConversation(sessionId, messagesRef.current, {
                terminalConnected: !!sshSocketRef.current,
                messageCount: messagesRef.current.length,
                lastUpdate: new Date()
            })
        }, 10000) // Save every 10 seconds

        return () => clearInterval(saveInterval)
    }, [sessionId]) // Only recreate when sessionId changes, use refs for latest values

    // Listen to enhanced agent:output events
    useEffect(() => {
        if (!sshSocket) return

        const handleAgentOutput = (data: {
            output: string,
            metadata: any,
            commandId?: string,
            timestamp: number
        }) => {
            // Accumulate FULL terminal history
            setTerminalHistory(prev => {
                const updated = [...prev, data.output]
                return updated.slice(-50000)
            })

            terminalAgent.onTerminalOutputReceived(data.output)
        }

        const handleSSHReady = (data: any) => {
            console.log('🚀 SSH Ready - agent will capture initial state')
            setTerminalHistory([])
        }

        const handleOSInfo = (data: any) => {
            if (data.osInfo) {
                const osInfoMessage = `\n🖥️ Auto-detected OS: ${data.osInfo}\n\n`
                setTerminalHistory(prev => [...prev, osInfoMessage])
            }
        }

        sshSocket.on('agent:output', handleAgentOutput)
        sshSocket.on('ready', handleSSHReady)
        sshSocket.on('agent:os-info', handleOSInfo)

        return () => {
            sshSocket.off('agent:output', handleAgentOutput)
            sshSocket.off('ready', handleSSHReady)
            sshSocket.off('agent:os-info', handleOSInfo)
        }
    }, [sshSocket]) // terminalAgent is stable, removed from deps to prevent re-registration

    // Auto-Reconnect Handler
    useEffect(() => {
        if (!sshSocket || !sessionId || !autoReconnectEnabled) return

        const handleDisconnect = async (reason: string) => {
            console.log('🔌 SSH disconnected:', reason)

            const hasSavedCreds = credentialManager.hasCredentials(sessionId)
            const hasPendingTask = autoReconnect.getPendingTask(sessionId) !== null

            if (hasSavedCreds && hasPendingTask && autoReconnectEnabled) {
                console.log('🔄 Initiating auto-reconnect sequence after reboot...')
                setIsReconnecting(true)

                await autoReconnect.attemptReconnect(
                    sessionId,
                    sshSocket,
                    (progress) => setReconnectProgress(progress),
                    (newSessionId) => {
                        console.log(`✅ Auto-reconnect successful! New session: ${newSessionId}`)
                        setIsReconnecting(false)
                        setReconnectProgress(null)

                        const successMsg: AIMessage = {
                            id: `reconnect-success-${Date.now()}`,
                            role: 'assistant',
                            content: `✅ **SSH Reconnected Successfully!**\n\n🔗 New session established\n💾 Resuming your task...`,
                            timestamp: new Date(),
                            type: 'text'
                        }
                        setMessages(prev => [...prev, successMsg])
                    },
                    (error) => {
                        console.error(`❌ Auto-reconnect failed: ${error}`)
                        setIsReconnecting(false)
                        setReconnectProgress(null)

                        const errorMsg: AIMessage = {
                            id: `reconnect-error-${Date.now()}`,
                            role: 'assistant',
                            content: `❌ **Auto-Reconnect Failed**\n\n${error}`,
                            timestamp: new Date(),
                            type: 'text'
                        }
                        setMessages(prev => [...prev, errorMsg])
                    }
                )
            }
        }

        sshSocket.on('disconnect', handleDisconnect)

        return () => {
            sshSocket.off('disconnect', handleDisconnect)
        }
    }, [sshSocket, sessionId, autoReconnectEnabled, messages, setMessages])

    // Helper to add autopilot messages
    const addAutoPilotMessage = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        const msg: AIMessage = {
            id: `autopilot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: text,
            timestamp: new Date(),
            type: 'text'
        }
        setMessages(prev => [...prev, msg])
    }

    return {
        conversationSessionId,
        isReconnecting,
        reconnectProgress,
        terminalHistory,
        addAutoPilotMessage
    }
}
