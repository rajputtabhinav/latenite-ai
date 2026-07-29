'use client'

import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Clock, Terminal } from 'lucide-react'

export interface CommandProgress {
  command: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  output?: string
  error?: string
  duration?: number
  startTime?: number
}

interface CommandProgressIndicatorProps {
  commands: CommandProgress[]
  currentIndex: number
  totalCommands: number
}

export default function CommandProgressIndicator({
  commands,
  currentIndex,
  totalCommands
}: CommandProgressIndicatorProps) {
  const progressPercent = totalCommands > 0 ? ((currentIndex + 1) / totalCommands) * 100 : 0

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">
            Command Execution Progress
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {currentIndex + 1} of {totalCommands}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
        />
      </div>

      {/* Command List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {commands.map((cmd, index) => (
          <CommandItem
            key={index}
            command={cmd}
            isActive={index === currentIndex}
          />
        ))}
      </div>
    </div>
  )
}

function CommandItem({ command, isActive }: { command: CommandProgress; isActive: boolean }) {
  const getStatusIcon = () => {
    switch (command.status) {
      case 'executing':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (command.status) {
      case 'executing':
        return 'border-cyan-500 bg-cyan-500/10'
      case 'completed':
        return 'border-green-500 bg-green-500/10'
      case 'failed':
        return 'border-red-500 bg-red-500/10'
      default:
        return 'border-gray-600 bg-gray-800'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded p-3 transition-all duration-300 ${getStatusColor()} ${
        isActive ? 'ring-2 ring-cyan-500' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">{getStatusIcon()}</div>
        
        <div className="flex-1 min-w-0">
          {/* Command */}
          <div className="font-mono text-sm text-white break-all">
            {command.command}
          </div>
          
          {/* Duration */}
          {command.duration && (
            <div className="text-xs text-gray-400 mt-1">
              Completed in {command.duration}ms
            </div>
          )}
          
          {/* Executing indicator */}
          {command.status === 'executing' && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex space-x-1">
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-cyan-400 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 bg-cyan-400 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 bg-cyan-400 rounded-full"
                />
              </div>
              <span className="text-xs text-cyan-400">Executing...</span>
            </div>
          )}
          
          {/* Output preview for completed commands */}
          {command.status === 'completed' && command.output && (
            <div className="mt-2 text-xs text-gray-400 bg-gray-900 rounded p-2 max-h-20 overflow-y-auto">
              {command.output.substring(0, 150)}
              {command.output.length > 150 && '...'}
            </div>
          )}
          
          {/* Error message */}
          {command.status === 'failed' && command.error && (
            <div className="mt-2 text-xs text-red-400 bg-red-900/20 rounded p-2">
              ❌ {command.error}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}


