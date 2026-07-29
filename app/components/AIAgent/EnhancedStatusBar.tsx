'use client'

import { motion } from 'framer-motion'
import { Terminal, Database, Clock, Brain, Wifi } from 'lucide-react'

interface EnhancedStatusBarProps {
  connectionStatus: 'idle' | 'connecting' | 'streaming' | 'error'
  sshConnected: boolean
  mcpEnabled: boolean
  activeTaskCount: number
  currentUser?: string
  currentHost?: string
}

export default function EnhancedStatusBar({
  connectionStatus,
  sshConnected,
  mcpEnabled,
  activeTaskCount,
  currentUser = '',
  currentHost = ''
}: EnhancedStatusBarProps) {
  
  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'streaming':
        return 'text-yellow-400 bg-yellow-400'
      case 'connecting':
        return 'text-blue-400 bg-blue-400'
      case 'error':
        return 'text-red-400 bg-red-400'
      default:
        return 'text-green-400 bg-green-400'
    }
  }
  
  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'streaming':
        return 'Working'
      case 'connecting':
        return 'Connecting'
      case 'error':
        return 'Error'
      default:
        return 'Ready'
    }
  }
  
  return (
    <div className="px-3 py-1.5 bg-gray-800/50 border-t border-gray-700/50">
      <div className="flex items-center justify-between text-xs">
        {/* Left: Status Indicators */}
        <div className="flex items-center gap-3">
          {/* AI Status */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${getConnectionColor().split(' ')[1]} ${
              connectionStatus === 'streaming' ? 'animate-pulse' : ''
            }`} />
            <span className={getConnectionColor().split(' ')[0]}>
              {getConnectionText()}
            </span>
          </div>
          
          {/* SSH Status */}
          {sshConnected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-600/20 rounded-full border border-blue-500/30"
            >
              <Terminal className="w-3 h-3 text-blue-400" />
              <span className="text-blue-400">SSH Live</span>
              {currentUser && currentHost && (
                <span className="text-blue-400/60 ml-1">
                  {currentUser}@{currentHost}
                </span>
              )}
            </motion.div>
          )}
          
          {/* MCP Status */}
          {mcpEnabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 bg-cyan-600/20 rounded-full border border-cyan-500/30"
            >
              <Database className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-400">Docs Ready</span>
            </motion.div>
          )}
        </div>
        
        {/* Right: Active Tasks Count */}
        {activeTaskCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 rounded-full border border-purple-500/30"
          >
            <Clock className="w-3 h-3 text-purple-400" />
            <span className="text-purple-400 font-medium">{activeTaskCount}</span>
            <span className="text-purple-400/70">active</span>
          </motion.div>
        )}
      </div>
    </div>
  )
}

