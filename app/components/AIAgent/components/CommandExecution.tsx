'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Copy, Check, Clock, Loader, CheckCircle, XCircle } from 'lucide-react'

interface CommandExecutionProps {
  command: string
  output?: string
  status: 'pending' | 'running' | 'complete' | 'error'
  duration?: number
  os?: 'windows' | 'linux' | 'macos' | 'unknown'
  timestamp?: Date
  onCopy?: () => void
  onRetry?: () => void
}

export default function CommandExecution({
  command,
  output,
  status,
  duration,
  os = 'unknown',
  timestamp,
  onCopy,
  onRetry
}: CommandExecutionProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (onCopy) {
      onCopy()
    } else {
      navigator.clipboard.writeText(command)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getOSBadge = () => {
    const badges = {
      windows: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Windows' },
      linux: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Linux' },
      macos: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'macOS' },
      unknown: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Shell' }
    }
    const badge = badges[os]
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text} font-medium`}>
        {badge.label}
      </span>
    )
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'running':
        return (
          <div className="flex items-center gap-1 text-yellow-400">
            <Loader className="w-3 h-3 animate-spin" />
            <span className="text-xs">Running...</span>
          </div>
        )
      case 'complete':
        return (
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs">Complete</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-1 text-red-400">
            <XCircle className="w-3 h-3" />
            <span className="text-xs">Failed</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-700 rounded-lg bg-gray-800/30 overflow-hidden"
    >
      {/* Command Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-300">Command Execution</span>
          {getOSBadge()}
        </div>
        <div className="flex items-center gap-3">
          {duration && (
            <div className="flex items-center gap-1 text-gray-400">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{(duration / 1000).toFixed(2)}s</span>
            </div>
          )}
          {getStatusDisplay()}
        </div>
      </div>

      {/* Command */}
      <div className="p-3 bg-gray-900/50">
        <div className="flex items-start justify-between gap-2">
          <code className="text-sm font-mono text-orange-300 flex-1">
            {command}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="Copy command"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Output */}
      {output && (
        <div className="px-3 pb-3">
          <div className="text-xs font-medium text-gray-400 mb-2">Output:</div>
          <div className="bg-black/30 rounded p-2 max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
              {output}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      {status === 'complete' && (
        <div className="px-3 pb-2 flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            Copy Command
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

