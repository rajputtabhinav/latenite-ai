'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Zap, AlertCircle, CheckCircle, Code, Terminal, X } from 'lucide-react'

interface Suggestion {
  type: 'command' | 'fix' | 'optimization' | 'tip'
  title: string
  description: string
  code?: string
  confidence: number
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[]
  onApply: (code: string) => void
  onDismiss: (index: number) => void
  className?: string
}

export default function SmartSuggestions({
  suggestions,
  onApply,
  onDismiss,
  className = ''
}: SmartSuggestionsProps) {
  if (suggestions.length === 0) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'fix': return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'optimization': return <Zap className="w-4 h-4 text-yellow-400" />
      case 'command': return <Terminal className="w-4 h-4 text-blue-400" />
      default: return <Lightbulb className="w-4 h-4 text-green-400" />
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'fix': return 'border-red-500/30 bg-red-900/10'
      case 'optimization': return 'border-yellow-500/30 bg-yellow-900/10'
      case 'command': return 'border-blue-500/30 bg-blue-900/10'
      default: return 'border-green-500/30 bg-green-900/10'
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence>
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
            className={`border rounded-lg p-3 ${getColor(suggestion.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1">
                {getIcon(suggestion.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-semibold text-white">{suggestion.title}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-2">{suggestion.description}</p>
                  
                  {suggestion.code && (
                    <div className="mt-2">
                      <code className="block px-3 py-2 bg-gray-900 rounded text-xs text-green-400 font-mono border border-gray-700">
                        {suggestion.code}
                      </code>
                      <button
                        onClick={() => suggestion.code && onApply(suggestion.code)}
                        className="mt-2 px-3 py-1 bg-primary-orange hover:bg-orange-600 text-white text-xs rounded transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Apply Command</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => onDismiss(index)}
                className="text-gray-400 hover:text-white transition-colors ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

