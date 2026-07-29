'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface TerminalCommandProposalProps {
  command: string
  explanation: string
  onApprove: () => void
  onReject: () => void
  prompt: string
}

export default function TerminalCommandProposal({
  command,
  explanation,
  onApprove,
  onReject,
  prompt
}: TerminalCommandProposalProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleApprove = () => {
    setIsVisible(false)
    onApprove()
  }

  const handleReject = () => {
    setIsVisible(false)
    onReject()
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gray-800 border border-primary-orange/30 rounded-md p-3 my-2 font-mono text-sm"
    >
      {/* AI Proposal Header */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-2 h-2 bg-primary-orange rounded-full animate-pulse"></div>
        <span className="text-primary-orange font-bold">🤖 AI AGENT PROPOSAL</span>
      </div>

      {/* Command Display */}
      <div className="bg-black rounded p-2 mb-2">
        <div className="text-gray-400 text-xs mb-1"># {explanation}</div>
        <div className="text-green-400">
          <span className="text-gray-400">{prompt}$ </span>
          <span className="bg-yellow-400/20 px-1 rounded">{command}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgb(34 197 94)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleApprove}
          className="flex-1 bg-green-600/80 hover:bg-green-600 text-white px-3 py-2 rounded text-xs font-bold transition-all"
        >
          ✓ EXECUTE (Press Enter)
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgb(239 68 68)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReject}
          className="flex-1 bg-red-600/80 hover:bg-red-600 text-white px-3 py-2 rounded text-xs font-bold transition-all"
        >
          ✗ REJECT (Esc)
        </motion.button>
      </div>

      {/* Keyboard Hint */}
      <div className="text-xs text-gray-400 mt-2 text-center">
        Press <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> to execute or <kbd className="bg-gray-700 px-1 rounded">Esc</kbd> to reject
      </div>
    </motion.div>
  )
}
