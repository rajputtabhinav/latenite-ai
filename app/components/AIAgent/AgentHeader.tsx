'use client'

import { motion } from 'framer-motion'
import {
  X,
  Menu,
  Database,
  Brain,
  Zap,
  Settings,
  Power,
  PowerOff,
  Bot,
  Trash2,
  FileText
} from 'lucide-react'

import type { ConnectionStatus } from '../../types'

interface AgentHeaderProps {
  connectionStatus: ConnectionStatus
  isMCPEnabled: boolean
  mcpStatus: 'idle' | 'processing' | 'success' | 'error'
  currentModel: { name: string; provider: string }
  onToggle: () => void
  onMenuToggle: () => void
  onStopStreaming: () => void
  onMCPToggle: () => void
  onClearHistory?: () => void
  onGenerateDocument?: () => void
  showMenuButton?: boolean
  sshConnected?: boolean
  autonomousMode?: boolean
  isDocumentGenerating?: boolean
  commandCount?: number
}

export default function AgentHeader({
  connectionStatus,
  isMCPEnabled,
  mcpStatus,
  currentModel,
  onToggle,
  onMenuToggle,
  onStopStreaming,
  onMCPToggle,
  onClearHistory,
  onGenerateDocument,
  showMenuButton = true,
  sshConnected = false,
  autonomousMode = false,
  isDocumentGenerating = false,
  commandCount = 0
}: AgentHeaderProps) {
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'streaming':
        return { text: 'Working...', color: 'text-yellow-400', bgColor: 'bg-yellow-400' }
      case 'connecting':
        return { text: 'Connecting...', color: 'text-blue-400', bgColor: 'bg-blue-400' }
      case 'error':
        return { text: 'Error', color: 'text-red-400', bgColor: 'bg-red-400' }
      default:
        return { text: 'Ready', color: 'text-green-400', bgColor: 'bg-green-400' }
    }
  }

  const getMCPStatusInfo = () => {
    switch (mcpStatus) {
      case 'processing':
        return { text: 'Live Data Processing...', color: 'text-yellow-400', icon: '🌐' }
      case 'success':
        return { text: 'Live Data Available', color: 'text-green-400', icon: '✅' }
      case 'error':
        return { text: 'MCP Error', color: 'text-red-400', icon: '❌' }
      default:
        return { text: 'Live Access Ready', color: 'text-cyan-400', icon: '🚀' }
    }
  }

  const statusInfo = getStatusInfo()
  const mcpStatusInfo = getMCPStatusInfo()

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700/50 backdrop-blur-sm flex-shrink-0">
      <div className="px-3 py-2">
        {/* Main Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {/* AI Agent Logo */}
            <div className="relative">
              <div className="w-7 h-7 bg-gradient-to-br from-primary-orange to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              {connectionStatus === 'streaming' && (
                <div className="absolute -top-1 -right-1">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                </div>
              )}
            </div>

            {/* Title & Status */}
            <div>
              <h1 className="text-xs font-semibold text-white">
                {sshConnected ? '🤖 Autonomous OS Agent' : 'AI Assistant'}
              </h1>
              <div className="flex items-center space-x-1.5">
                <div className="flex items-center space-x-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.bgColor} ${connectionStatus === 'streaming' ? 'animate-pulse' : ''
                    }`} />
                  <span className={`text-[10px] ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                </div>
                {sshConnected && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[10px] text-blue-400">SSH Ready</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-1">
            {/* Generate Document Button */}
            {onGenerateDocument && sshConnected && commandCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onGenerateDocument}
                disabled={isDocumentGenerating}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-orange hover:bg-gray-700 transition-all duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate Documentation"
              >
                {isDocumentGenerating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FileText className="w-3.5 h-3.5 text-primary-orange" />
                  </motion.div>
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                {isDocumentGenerating && (
                  <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[8px] text-primary-orange whitespace-nowrap">
                    Analyzing...
                  </span>
                )}
              </motion.button>
            )}

            {/* Clear History Button */}
            {onClearHistory && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClearHistory}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-all duration-200"
                title="Clear History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            )}

            {/* Settings Menu */}
            {showMenuButton && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onMenuToggle}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </motion.button>
            )}

            {/* Stop Streaming Button */}
            {connectionStatus === 'streaming' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={onStopStreaming}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-medium"
              >
                Stop
              </motion.button>
            )}

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggle}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {connectionStatus === 'streaming' && (
        <div className="h-1 bg-gray-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-primary-orange to-yellow-400"
          />
        </div>
      )}
    </div>
  )
} 