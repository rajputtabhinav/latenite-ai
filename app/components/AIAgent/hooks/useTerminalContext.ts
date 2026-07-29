/**
 * useTerminalContext Hook
 * Manages terminal history and context extraction
 */

import { useState, useEffect, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import {
  getChatTerminalContext,
  getTaskTerminalContext
} from '../utils/terminalContext'

export function useTerminalContext(sshSocket?: Socket | null) {
  const [terminalHistory, setTerminalHistory] = useState<string[]>([])
  const [lastSentTerminalLine, setLastSentTerminalLine] = useState(0)
  const [lastCommand, setLastCommand] = useState('')

  // Listen to enhanced agent:output events from server for full context
  useEffect(() => {
    if (!sshSocket) return

    const handleAgentOutput = (data: { 
      output: string
      metadata: any
      commandId?: string
      timestamp: number 
    }) => {
      console.log('🤖 Agent received enhanced output:', {
        length: data.output.length,
        hasError: data.metadata?.isError,
        isComplete: data.metadata?.isComplete,
        commandId: data.commandId,
        isInitial: data.metadata?.isInitial
      })
      
      // Accumulate FULL terminal history for agent context with 1M token window
      setTerminalHistory(prev => {
        const updated = [...prev, data.output]
        // Keep last 50000 lines! (1M context = ~750k words = massive history)
        return updated.slice(-50000)
      })
    }

    const handleSSHReady = () => {
      console.log('🚀 SSH Ready - agent will capture initial state')
      // Initial prompt will come through agent:output events
      setTerminalHistory([])  // Reset history on new connection
      setLastSentTerminalLine(0)
      setLastCommand('')
    }

    const handleOSInfo = (data: any) => {
      console.log('🖥️ OS Info received from auto-detection:', data.osInfo?.substring(0, 100))
      // Add OS info to terminal history so agent can see it
      if (data.osInfo) {
        const osInfoMessage = `\n🖥️ Auto-detected OS: ${data.osInfo}\n\n`
        setTerminalHistory(prev => [...prev, osInfoMessage])
        console.log('✅ OS info added to agent context')
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
  }, [sshSocket])

  // Get chat-optimized terminal context
  const getChatContext = useCallback(() => {
    return getChatTerminalContext(terminalHistory, lastSentTerminalLine, lastCommand)
  }, [terminalHistory, lastSentTerminalLine, lastCommand])

  // Get task-optimized terminal context
  const getTaskContext = useCallback(() => {
    return getTaskTerminalContext(terminalHistory, lastCommand)
  }, [terminalHistory, lastCommand])

  // Update last sent line (for incremental context)
  const updateLastSentLine = useCallback(() => {
    setLastSentTerminalLine(terminalHistory.length)
  }, [terminalHistory.length])

  // Update last command
  const updateLastCommand = useCallback((command: string) => {
    setLastCommand(command)
  }, [])

  return {
    terminalHistory,
    lastSentTerminalLine,
    lastCommand,
    getChatContext,
    getTaskContext,
    updateLastSentLine,
    updateLastCommand,
    setTerminalHistory
  }
}

