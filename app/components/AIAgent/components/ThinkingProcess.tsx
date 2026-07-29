'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronDown, ChevronUp, Check, Loader, AlertCircle } from 'lucide-react'

interface ThinkingIteration {
  number: number
  thought: string
  action: string
  observation: string
  status: 'pending' | 'running' | 'complete' | 'error'
  duration?: number
}

interface ThinkingProcessProps {
  iterations: ThinkingIteration[]
  currentIteration?: number
  isComplete?: boolean
}

export default function ThinkingProcess({ 
  iterations, 
  currentIteration = 0,
  isComplete = false 
}: ThinkingProcessProps) {
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(
    new Set([iterations.length - 1]) // Expand last iteration by default
  )

  const toggleIteration = (index: number) => {
    const newExpanded = new Set(expandedIterations)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedIterations(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader className="w-4 h-4 text-yellow-400 animate-spin" />
      case 'complete':
        return <Check className="w-4 h-4 text-green-400" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-yellow-500/30 bg-yellow-500/5'
      case 'complete':
        return 'border-green-500/30 bg-green-500/5'
      case 'error':
        return 'border-red-500/30 bg-red-500/5'
      default:
        return 'border-gray-700 bg-gray-800/50'
    }
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg">
        <Brain className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-gray-300">Thinking Process</span>
        {!isComplete && (
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Step {currentIteration}/{iterations.length}</span>
          </div>
        )}
        {isComplete && (
          <div className="ml-auto flex items-center gap-1">
            <Check className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">Complete</span>
          </div>
        )}
      </div>

      {/* Iterations */}
      <div className="space-y-2">
        {iterations.map((iteration, index) => {
          const isExpanded = expandedIterations.has(index)
          const isCurrent = index === currentIteration - 1

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border rounded-lg ${getStatusColor(iteration.status)} ${
                isCurrent ? 'ring-2 ring-yellow-500/20' : ''
              }`}
            >
              {/* Iteration Header */}
              <button
                onClick={() => toggleIteration(index)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(iteration.status)}
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">
                      Iteration {iteration.number}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-md">
                      {iteration.thought.substring(0, 60)}...
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {iteration.duration && (
                    <span className="text-xs text-gray-500">{iteration.duration}ms</span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Iteration Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3 border-t border-gray-700/50">
                      {/* Thought */}
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1 mt-2">💭 Thought</div>
                        <div className="text-sm text-gray-300 bg-gray-900/50 rounded p-2">
                          {iteration.thought}
                        </div>
                      </div>

                      {/* Action */}
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">⚡ Action</div>
                        <div className="text-sm font-mono text-orange-300 bg-gray-900/50 rounded p-2">
                          {iteration.action || 'TASK_COMPLETE'}
                        </div>
                      </div>

                      {/* Observation */}
                      {iteration.observation && (
                        <div>
                          <div className="text-xs font-medium text-gray-400 mb-1">📊 Observation</div>
                          <div className="text-xs text-gray-400 bg-gray-900/50 rounded p-2 max-h-32 overflow-y-auto font-mono">
                            {iteration.observation.substring(0, 500)}
                            {iteration.observation.length > 500 && '...'}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

