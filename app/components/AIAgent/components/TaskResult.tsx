'use client'

import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Copy, Download, RotateCcw, Check } from 'lucide-react'
import { useState } from 'react'

interface TaskResultProps {
  taskDescription: string
  success: boolean
  answer: string
  rawOutput?: string
  duration?: number
  onCopy?: () => void
  onRetry?: () => void
  onExport?: () => void
}

export default function TaskResult({
  taskDescription,
  success,
  answer,
  rawOutput,
  duration,
  onCopy,
  onRetry,
  onExport
}: TaskResultProps) {
  const [showRawOutput, setShowRawOutput] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const content = rawOutput || answer
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`border-2 rounded-lg overflow-hidden ${
        success 
          ? 'border-green-500/30 bg-green-500/5' 
          : 'border-red-500/30 bg-red-500/5'
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b ${
        success ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            {success ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className={`text-sm font-semibold ${success ? 'text-green-300' : 'text-red-300'}`}>
                {success ? 'Task Complete' : 'Task Failed'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {taskDescription}
              </div>
            </div>
          </div>
          {duration && (
            <div className="text-xs text-gray-500">
              {(duration / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      </div>

      {/* Answer/Result */}
      <div className="px-4 py-3">
        <div className="text-sm text-gray-200 leading-relaxed">
          {answer}
        </div>
      </div>

      {/* Raw Output Toggle */}
      {rawOutput && rawOutput !== answer && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowRawOutput(!showRawOutput)}
            className="text-xs text-gray-400 hover:text-gray-300 underline"
          >
            {showRawOutput ? 'Hide' : 'Show'} raw output
          </button>
          
          {showRawOutput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-2"
            >
              <div className="bg-black/30 rounded p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                  {rawOutput}
                </pre>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-2 bg-gray-800/30 border-t border-gray-700 flex gap-2">
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy Result
            </>
          )}
        </button>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Retry Task
          </button>
        )}
        
        {onExport && (
          <button
            onClick={onExport}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        )}
      </div>
    </motion.div>
  )
}

