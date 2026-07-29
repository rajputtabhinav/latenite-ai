'use client'

import { useEffect, useCallback } from 'react'
import { SessionPersistence, AgentMemory, AutoSaver } from '../lib/session-persistence'

interface AgentMemoryManagerProps {
  messages: Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>
  selectedModel: string
  isMCPEnabled: boolean
  agentWidth: number
  isAutoPilotEnabled: boolean
  commandHistory: string[]
  workingDirectory: string
  onRestore: (memory: AgentMemory) => void
}

export default function AgentMemoryManager({
  messages,
  selectedModel,
  isMCPEnabled,
  agentWidth,
  isAutoPilotEnabled,
  commandHistory,
  workingDirectory,
  onRestore
}: AgentMemoryManagerProps) {
  const autoSaver = useCallback(() => new AutoSaver(2000), [])()

  // Restore on mount
  useEffect(() => {
    const restored = SessionPersistence.restoreAgentMemory()
    if (restored) {
      console.log('✅ Restoring agent memory...')
      onRestore(restored)
    }
  }, [onRestore])

  // Auto-save on changes
  useEffect(() => {
    const memory: AgentMemory = {
      conversations: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.getTime()
      })),
      settings: {
        selectedModel,
        isMCPEnabled,
        width: agentWidth,
        isAutoPilotEnabled
      },
      commandHistory: commandHistory.slice(-100), // Keep last 100
      recentFiles: [],
      workingDirectory,
      lastUpdated: Date.now()
    }

    autoSaver.save('latenite_agent_memory', memory)
  }, [messages, selectedModel, isMCPEnabled, agentWidth, isAutoPilotEnabled, commandHistory, workingDirectory, autoSaver])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      autoSaver.cancel()
    }
  }, [autoSaver])

  return null // This is a utility component with no UI
}

