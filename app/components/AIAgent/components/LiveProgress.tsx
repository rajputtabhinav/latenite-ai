'use client'

import { motion } from 'framer-motion'
import { Loader, Zap } from 'lucide-react'

interface LiveProgressProps {
  currentStep: number
  totalSteps: number
  currentAction: string
  estimatedTime?: number
}

export default function LiveProgress({
  currentStep,
  totalSteps,
  currentAction,
  estimatedTime
}: LiveProgressProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-3 border border-yellow-500/30 rounded-lg bg-yellow-500/5 overflow-hidden"
    >
      {/* Progress Bar */}
      <div className="h-1 bg-gray-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
        />
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Loader className="w-4 h-4 text-yellow-400 animate-spin" />
            <span className="text-sm font-medium text-yellow-300">
              Working on it...
            </span>
          </div>
          <span className="text-xs text-gray-400">
            Step {currentStep}/{totalSteps}
          </span>
        </div>

        {/* Current Action */}
        <div className="flex items-start gap-2">
          <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-gray-300 leading-relaxed">
            {currentAction}
          </span>
        </div>

        {/* Estimated Time */}
        {estimatedTime && (
          <div className="mt-2 text-xs text-gray-500">
            Est. {Math.ceil(estimatedTime / 1000)}s remaining
          </div>
        )}
      </div>
    </motion.div>
  )
}

