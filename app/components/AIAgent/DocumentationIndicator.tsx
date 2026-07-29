'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { useState } from 'react'

interface DocumentationIndicatorProps {
  libraries: string[]
  timestamp?: number
}

export default function DocumentationIndicator({ 
  libraries, 
  timestamp 
}: DocumentationIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!libraries || libraries.length === 0) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="mb-3"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-blue-600/10 border border-blue-500/30 rounded-lg hover:bg-blue-600/15 transition-colors group"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-blue-300 flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span>Auto-fetched Documentation</span>
            </div>
            <div className="text-[10px] text-blue-400/70 truncate">
              {libraries.join(', ')}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {timestamp && (
            <span className="text-[10px] text-gray-500">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-blue-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-blue-400" />
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 px-3 py-2 bg-blue-900/10 border border-blue-500/20 rounded-lg">
              <div className="text-xs text-gray-300 mb-2">
                The AI has automatically fetched up-to-date documentation for:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {libraries.map((lib, index) => (
                  <motion.div
                    key={lib}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-[10px] text-blue-300"
                  >
                    <FileText className="w-2.5 h-2.5" />
                    <span>{lib}</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                This ensures the AI uses the latest syntax and best practices.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

