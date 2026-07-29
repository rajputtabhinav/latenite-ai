'use client'

import { motion } from 'framer-motion'
import { Sparkles, Check, X } from 'lucide-react'

interface InlineCodeSuggestionProps {
  suggestion: string
  description?: string
  onAccept: () => void
  onReject: () => void
  position?: { x: number; y: number }
}

export default function InlineCodeSuggestion({
  suggestion,
  description,
  onAccept,
  onReject,
  position
}: InlineCodeSuggestionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed z-50"
      style={{
        left: position?.x || '50%',
        top: position?.y || '50%',
        transform: position ? 'none' : 'translate(-50%, -50%)'
      }}
    >
      <div className="bg-gray-900 border border-primary-orange rounded-lg shadow-2xl p-3 max-w-md">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary-orange animate-pulse" />
          <span className="text-xs font-semibold text-white">AI Suggestion</span>
        </div>

        {/* Suggestion Content */}
        <div className="mb-3">
          {description && (
            <p className="text-xs text-gray-300 mb-2">{description}</p>
          )}
          <code className="block px-3 py-2 bg-black rounded text-xs text-green-400 font-mono border border-gray-700">
            {suggestion}
          </code>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onAccept}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center space-x-1 transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Accept (Tab)</span>
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded flex items-center space-x-1 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Reject (Esc)</span>
            </button>
          </div>
          <span className="text-[10px] text-gray-500">Powered by AI</span>
        </div>
      </div>
    </motion.div>
  )
}

