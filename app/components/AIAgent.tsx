'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical } from 'lucide-react'

// Components
import AgentHeader from './AIAgent/AgentHeader'
import AgentSettings from './AIAgent/AgentSettings'
import AgentChatArea from './AIAgent/ui/AgentChatArea'
import AgentInputArea from './AIAgent/ui/AgentInputArea'
import TaskTimeline from './AIAgent/TaskTimeline'
import DocumentPreviewModal from './DocumentPreviewModal'

// Hooks
import { useAgentState } from './AIAgent/hooks/useAgentState'
import { useAgentSocket } from './AIAgent/hooks/useAgentSocket'
import { useAgentExecution } from './AIAgent/hooks/useAgentExecution'
import { useAgentMCP } from './AIAgent/hooks/useAgentMCP'
import { useMessageStore } from './AIAgent/hooks/useMessageStore'

// Libs & Types
import { TerminalAgentController } from '../lib/terminal-agent-integration'
import { AGENT_CONFIG } from '../lib/constants/agent-config'
import type { TerminalState, AgentBridgeStatus, CommandQueueStats, AIModel, ProcessedFile } from '../types'
import type { Socket } from 'socket.io-client'

// Unique ID generator to prevent duplicate keys
let messageIdCounter = 0
const generateUniqueMessageId = () => {
  messageIdCounter++
  return `${Date.now()}_${messageIdCounter}_${Math.random().toString(36).substring(2, 9)}`
}

interface AIAgentProps {
  isOpen: boolean
  onToggle: () => void
  terminalOutput?: string[]
  onCodeInsert?: (code: string) => void
  onWidthChange?: (width: number) => void
  sshSocket?: Socket | null
  sessionId?: string
  onCommandPropose?: (command: string, explanation: string) => Promise<void>
  terminalState?: TerminalState
  bridgeStatus?: AgentBridgeStatus
  queueStats?: CommandQueueStats
  onTerminalCommand?: (command: string) => Promise<void>
}

const allModels: AIModel[] = [
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    description: '🚀 Latest - 1M context, Anthropic direct API',
    provider: 'anthropic',
    isDefault: true,
    contextWindow: AGENT_CONFIG.CONTEXT_WINDOW
  }
]

export default function AIAgent({
  isOpen,
  onToggle,
  terminalOutput,
  onCodeInsert,
  onWidthChange,
  sshSocket: propSshSocket,
  sessionId,
  onCommandPropose,
  terminalState,
  bridgeStatus,
  queueStats,
  onTerminalCommand
}: AIAgentProps) {

  // 1. Message Store
  const {
    messages,
    addMessage,
    setMessages,
    clearMessages,
    messageCount
  } = useMessageStore({
    maxMessages: 1000,
    enablePersistence: true,
    persistenceKey: 'latenite_agent_messages'
  })

  // 2. UI & Settings State
  const state = useAgentState()

  // 3. Terminal Agent Controller
  const [terminalAgent] = useState(() => new TerminalAgentController())
  
  // 3.5 Command Count Tracking
  const [commandCount, setCommandCount] = useState(0)

  // 4. Socket & Connection Logic
  const socketState = useAgentSocket({
    sshSocket: propSshSocket || null,
    sessionId,
    messages,
    setMessages,
    selectedModel: state.selectedModel,
    autoReconnectEnabled: state.autoReconnectEnabled,
    terminalAgent
  })

  // 5. Execution Logic (ReAct Loop)
  const execution = useAgentExecution({
    sshSocket: propSshSocket || null,
    setMessages,
    setIsLoading: state.setIsLoading,
    setStreamingMessageId: state.setStreamingMessageId,
    setConnectionStatus: state.setConnectionStatus,
    selectedModel: state.selectedModel,
    terminalHistory: socketState.terminalHistory,
    addAutoPilotMessage: socketState.addAutoPilotMessage,
    terminalAgent // Pass the controller instance
  })

  // 6. MCP Logic
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mcp = useAgentMCP({
    isMCPEnabled: state.isMCPEnabled,
    setIsMCPEnabled: state.setIsMCPEnabled,
    setMcpServers: state.setMcpServers,
    setMcpCategories: state.setMcpCategories,
    mcpServers: state.mcpServers,
    selectedCategory: state.selectedCategory,
    input: state.input,
    setInput: state.setInput,
    inputRef,
    setSelectedTool: state.setSelectedTool,
    setShowToolsDropdown: state.setShowToolsDropdown
  })

  // Resize Logic
  const resizeRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    state.setIsResizing(true)
    e.preventDefault()
  }, [state])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!state.isResizing) return
    const newWidth = window.innerWidth - e.clientX
    const clampedWidth = Math.max(300, Math.min(800, newWidth))
    state.setWidth(clampedWidth)
    if (onWidthChange) onWidthChange(clampedWidth)
  }, [state.isResizing, onWidthChange, state])

  const handleMouseUp = useCallback(() => {
    state.setIsResizing(false)
    if (onWidthChange) onWidthChange(state.width)
  }, [state.width, onWidthChange, state])

  useEffect(() => {
    if (state.isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [state.isResizing, handleMouseMove, handleMouseUp])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Open settings
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        state.setShowHamburgerMenu(true)
      }
      // Cmd/Ctrl + L: Clear chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        if (confirm('Clear chat history?')) clearMessages()
      }
      // Escape: Close settings/dropdowns
      if (e.key === 'Escape') {
        state.setShowHamburgerMenu(false)
        state.setShowToolsDropdown(false)
        state.setShowModelsDropdown(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyboard)
      return () => document.removeEventListener('keydown', handleKeyboard)
    }
  }, [isOpen, state, clearMessages])

  // Cleanup empty messages on mount and when messages change
  useEffect(() => {
    // Remove any messages with empty content (orphaned streaming messages)
    setMessages(prev => {
      const cleaned = prev.filter(m => m.content && m.content.trim().length > 0)
      if (cleaned.length !== prev.length) {
        console.log(`🧹 Cleaned up ${prev.length - cleaned.length} empty message(s)`)
      }
      return cleaned
    })
  }, []) // Run once on mount

  // Handle Message Sending
  const handleSendMessage = async () => {
    if (!state.input.trim() || state.isLoading) return

    // Check for autonomous terminal task (SSH connected)
    if (propSshSocket && sessionId) {
      await execution.handleAutonomousTerminalTask(state.input)
      state.setInput('')
      return
    }

    // FALLBACK: Simple chat mode when NOT connected to SSH
    const userMsg = {
      id: generateUniqueMessageId(),
      role: 'user' as const,
      content: state.input,
      timestamp: new Date(),
      type: 'text' as const
    }
    setMessages(prev => [...prev, userMsg])
    state.setInput('')
    state.setIsLoading(true)

    try {
      // Ensure model is selected
      if (!state.selectedModel) {
        throw new Error('No model selected. Please select a model in settings.')
      }

      // Build payload with validation - filter out empty messages
      const allMessages = [...messages, userMsg]
      const validMessages = allMessages
        .filter(m => m.content && m.content.trim().length > 0)
        .map(m => ({
          role: m.role,
          content: m.content.trim()
        }))

      // Ensure we have at least the user message
      if (validMessages.length === 0) {
        throw new Error('No valid messages to send')
      }

      // Build comprehensive payload with all context
      const payload = {
        messages: validMessages,
        model: state.selectedModel,
        autoRouteModel: true,
        // AI Conversation Session Context
        conversationSessionId: socketState.conversationSessionId,
        // Terminal Context
        terminalContext: terminalState ? {
          currentDirectory: terminalState.currentDirectory,
          lastCommand: terminalState.lastCommand,
          lastOutput: terminalState.lastOutput,
          isConnected: !!propSshSocket,
          sessionId: sessionId
        } : undefined,
        // MCP Context
        mcpEnabled: state.isMCPEnabled,
        mcpContext: state.isMCPEnabled ? {
          servers: state.mcpServers,
          availableTools: Object.values(state.mcpServers)
            .filter((s: any) => s.running)
            .flatMap((s: any) => s.config?.tools || [])
        } : undefined,
        // Live Access Indicator
        hasLiveAccess: !!propSshSocket || state.isMCPEnabled
      }

      console.log('🚀 Sending request to AI API (streaming)...', {
        messageCount: payload.messages.length,
        model: payload.model,
        hasSession: !!payload.conversationSessionId,
        hasTerminal: !!payload.terminalContext,
        mcpEnabled: payload.mcpEnabled,
        hasLiveAccess: payload.hasLiveAccess
      })

      // Create streaming message immediately
      const streamingMsgId = generateUniqueMessageId()
      const streamingMsg = {
        id: streamingMsgId,
        role: 'assistant' as const,
        content: '',
        timestamp: new Date(),
        type: 'text' as const,
        isStreaming: true
      }
      setMessages(prev => [...prev, streamingMsg])
      state.setStreamingMessageId(streamingMsgId)

      // Create AbortController for cancellation support
      const abortController = new AbortController()

      // Call STREAMING API for word-by-word effect
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      // Check for response body
      if (!response.body) {
        throw new Error('No response body received from API')
      }

      // Read SSE stream word by word
      const reader = response.body.getReader()
      
      try {
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataString = line.slice(6).trim()
            
            // Skip empty data
            if (!dataString) continue
            
            try {
              const data = JSON.parse(dataString)
              
              // Handle error events from server
              if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error occurred')
              }
              
              // Handle content streaming
              if (data.type === 'content' && data.content) {
                fullContent += data.content
                
                // Update message in real-time (word-by-word streaming)
                setMessages(prev => prev.map(m =>
                  m.id === streamingMsgId
                    ? { ...m, content: fullContent }
                    : m
                ))
              }
              
              // Handle completion
              if (data.type === 'done') {
                break
              }
              
              // Handle start event (connection confirmation)
              if (data.type === 'start') {
                console.log(`✅ Connected to ${data.provider} using ${data.model}`)
              }
            } catch (parseError) {
              // Only log if it's not an empty line or [DONE] marker
              if (dataString !== '[DONE]' && dataString.length > 0) {
                console.debug('Skipped non-JSON SSE data:', dataString.substring(0, 50))
              }
            }
          }
        }
      }
      } finally {
        // Always clean up reader
        try {
          reader.releaseLock()
        } catch (e) {
          // Already released
        }
      }

      // Mark streaming complete
      setMessages(prev => prev.map(m =>
        m.id === streamingMsgId
          ? { ...m, isStreaming: false }
          : m
      ))
      state.setStreamingMessageId(null)
      console.log('✅ Streaming complete')
    
    } catch (error: any) {
      console.error('❌ Chat error:', error)
      
      // Clean up streaming state on errors - remove empty streaming messages
      setMessages(prev => prev.filter(m => {
        // Keep all non-streaming messages
        if (!m.isStreaming) return true
        // Keep streaming messages that have content
        if (m.content && m.content.trim().length > 0) {
          return true
        }
        // Remove empty streaming messages
        console.log(`🧹 Removing empty streaming message: ${m.id}`)
        return false
      }).map(m => 
        // Mark remaining streaming messages as complete
        m.isStreaming ? { ...m, isStreaming: false } : m
      ))
      state.setStreamingMessageId(null)
      
      // Determine specific error message
      let errorMessage = error.message
      let troubleshooting = ''
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request cancelled'
        troubleshooting = ''
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please ensure the server is running.'
        troubleshooting = '\n\n**Troubleshooting:**\n• Check server is running: `npm run dev`\n• Server should be on http://localhost:5000\n• Check terminal for server errors'
      } else if (error.message.includes('API key') || error.message.includes('Anthropic')) {
        errorMessage = 'Anthropic API key issue detected'
        troubleshooting = '\n\n**Troubleshooting:**\n• Verify ANTHROPIC_API_KEY in .env.local file\n• Restart the dev server after adding the key\n• Check the key is valid at https://console.anthropic.com'
      } else if (error.message.includes('streaming')) {
        errorMessage = 'Streaming connection interrupted'
        troubleshooting = '\n\n**Troubleshooting:**\n• Check your internet connection\n• Refresh the page and try again\n• Check browser console for details'
      }
      
      const errorMsg = {
        id: generateUniqueMessageId(),
        role: 'assistant' as const,
        content: `❌ Error: ${errorMessage}${troubleshooting}`,
        timestamp: new Date(),
        type: 'text' as const
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      state.setIsLoading(false)
      state.setStreamingMessageId(null)  // Ensure streaming state is always cleaned
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="agent-panel"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: `${state.width}px`, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="h-full bg-gray-900 border-l border-gray-700 flex flex-col shadow-2xl flex-shrink-0 relative"
        style={{ width: `${state.width}px`, minWidth: `${state.width}px`, maxWidth: `${state.width}px` }}
      >
        {/* Resize Handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 w-1 h-full bg-gray-600 hover:bg-primary-orange cursor-col-resize transition-colors z-10 group"
        >
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Settings Panel */}
        <AgentSettings
          isOpen={state.showHamburgerMenu}
          onClose={() => state.setShowHamburgerMenu(false)}
          selectedModel={state.selectedModel}
          models={allModels}
          onModelChange={(modelId) => {
            state.setSelectedModel(modelId)
            state.setShowHamburgerMenu(false)
          }}
          isMCPEnabled={state.isMCPEnabled}
          mcpServers={state.mcpServers}
          mcpCategories={state.mcpCategories}
          selectedCategory={state.selectedCategory}
          onMCPToggle={() => state.setIsMCPEnabled(!state.isMCPEnabled)}
          onCategoryChange={state.setSelectedCategory}
          onServerToggle={mcp.toggleMCPServer}
          onStopAllServers={mcp.stopAllMCPServers}
          onRefreshServers={mcp.fetchMCPData}
          onClearChat={() => {
            clearMessages()
            localStorage.removeItem('latenite_agent_memory')
          }}
        />

        {/* Main Layout */}
        <div className="flex flex-col h-full">
          <AgentHeader
            connectionStatus={state.connectionStatus}
            isMCPEnabled={state.isMCPEnabled}
            mcpStatus={state.mcpStatus}
            currentModel={allModels.find(m => m.id === state.selectedModel) || allModels[0]}
            onToggle={onToggle}
            onMenuToggle={() => state.setShowHamburgerMenu(!state.showHamburgerMenu)}
            onStopStreaming={() => {
              // Implement stop logic if needed
              state.setIsLoading(false)
            }}
            onMCPToggle={() => state.setIsMCPEnabled(!state.isMCPEnabled)}
            onClearHistory={() => {
              if (confirm('Clear history?')) clearMessages()
            }}
            onGenerateDocument={() => state.setShowDocumentPreview(true)}
            sshConnected={!!propSshSocket}
            autonomousMode={true}
            isDocumentGenerating={state.isDocumentGenerating}
            commandCount={commandCount}
          />

          {/* Task Timeline */}
          {state.showTaskTimeline && (
            <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
              <TaskTimeline
                taskId={state.showTaskTimeline}
                events={state.taskTimelineEvents}
                isLive={true}
              />
            </div>
          )}

          {/* Chat Area */}
          <AgentChatArea
            messages={messages}
            isLoading={state.isLoading}
            isReconnecting={socketState.isReconnecting}
            reconnectProgress={socketState.reconnectProgress}
            onCancelReconnect={() => {
              // Cancel reconnection by disconnecting socket
              if (propSshSocket) {
                propSshSocket.disconnect()
              }
            }}
            terminalState={terminalState}
            onCopy={(text) => navigator.clipboard.writeText(text)}
            onInsertCode={onCodeInsert}
            copiedId={null}
            streamingMessageId={state.streamingMessageId}
            onSendExample={(example) => {
              state.setInput(example)
              // Auto-focus input after setting example
              setTimeout(() => inputRef.current?.focus(), 100)
            }}
          />

          {/* Input Area */}
          <AgentInputArea
            input={state.input}
            setInput={state.setInput}
            onSend={handleSendMessage}
            isLoading={state.isLoading}
            onStop={() => state.setIsLoading(false)}
            inputRef={inputRef}

            // File Upload
            uploadedFiles={state.uploadedFiles}
            onRemoveFile={(fileId) => state.setUploadedFiles(prev => prev.filter(f => f.id !== fileId))}
            isProcessingFiles={state.isProcessingFiles}
            onFileUpload={async (e) => {
              const files = e.target.files
              if (!files || files.length === 0) return

              state.setIsProcessingFiles(true)
              try {
                const processed: ProcessedFile[] = await Promise.all(
                  Array.from(files).map(async (file): Promise<ProcessedFile> => {
                    // Read file content
                    const content = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader()
                      reader.onload = () => resolve(reader.result as string)
                      reader.onerror = reject
                      reader.readAsText(file)
                    })

                    return {
                      id: generateUniqueMessageId() + '_' + file.name,
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      data: content.slice(0, 10000), // Limit to 10K chars
                      timestamp: new Date()
                    }
                  })
                )
                
                state.setUploadedFiles(prev => [...prev, ...processed])
                
                // Add assistant message about uploaded files
                setMessages(prev => [...prev, {
                  id: generateUniqueMessageId(),
                  role: 'assistant' as const,
                  content: `📎 Files uploaded: ${processed.map(f => `**${f.name}** (${Math.round(f.size / 1024)}KB)`).join(', ')}\n\nI can now analyze these files. What would you like me to do with them?`,
                  timestamp: new Date(),
                  type: 'text' as const
                }])
              } catch (error: any) {
                console.error('File upload error:', error)
                setMessages(prev => [...prev, {
                  id: generateUniqueMessageId(),
                  role: 'assistant' as const,
                  content: `❌ Error uploading files: ${error.message}`,
                  timestamp: new Date(),
                  type: 'text' as const
                }])
              } finally {
                state.setIsProcessingFiles(false)
              }
            }}

            // Tools
            showToolsDropdown={state.showToolsDropdown}
            setShowToolsDropdown={state.setShowToolsDropdown}
            onOpenSettings={() => state.setShowHamburgerMenu(true)}
            selectedTool={state.selectedTool}
            setSelectedTool={state.setSelectedTool}
            mcpServers={state.mcpServers}

            // Models
            selectedModel={state.selectedModel}
            setSelectedModel={state.setSelectedModel}
            showModelsDropdown={state.showModelsDropdown}
            setShowModelsDropdown={state.setShowModelsDropdown}
            allModels={allModels}

            // Toggles
            isVoiceEnabled={state.isVoiceEnabled}
            onToggleVoice={() => state.setIsVoiceEnabled(!state.isVoiceEnabled)}
            webSearchEnabled={state.webSearchEnabled}
            setWebSearchEnabled={state.setWebSearchEnabled}
            showWebSearchIndicator={state.webSearchEnabled}

            // Status
            connectionStatus={state.connectionStatus}
            sshSocket={propSshSocket}
            sessionId={sessionId}
          />
        </div>

        {/* Document Preview Modal */}
        <DocumentPreviewModal
          isOpen={state.showDocumentPreview}
          onClose={() => state.setShowDocumentPreview(false)}
          document={state.generatedDocument as any}
          onDownload={(format) => {
            console.log(`Download ${format}`)
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}