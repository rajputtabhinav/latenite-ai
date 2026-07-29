'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, ChevronDown, ChevronUp, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'

interface TerminalStatusPanelProps {
  isConnected: boolean
  currentUser?: string
  currentHost?: string
  currentPath?: string
  terminalOutput?: string[]
  connectionStatus?: string
}

export default function TerminalStatusPanel({
  isConnected,
  currentUser = 'user',
  currentHost = 'localhost',
  currentPath = '~',
  terminalOutput = [],
  connectionStatus = 'idle'
}: TerminalStatusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!isConnected) return null
  
  const lastOutput = terminalOutput.slice(-20).filter(line => line.trim().length > 0)
  
  return (
    <div className="border-b border-gray-700 bg-gray-900/70 backdrop-blur-sm">
      <div className="px-4 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:bg-gray-800/50 rounded p-1 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Terminal className="w-4 h-4 text-green-400" />
              {connectionStatus === 'connected' && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-left">
              <span className="text-xs font-medium text-gray-300">Terminal Live</span>
              <div className="text-[10px] text-gray-500">
                {currentUser}@{currentHost}:{currentPath}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-600/20 rounded-full">
              <Wifi className="w-2.5 h-2.5 text-green-400" />
              <span className="text-[10px] text-green-400">Connected</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-gray-400" />
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
              <div className="mt-2 bg-black/40 rounded-lg p-3 border border-gray-700">
                <div className="text-[10px] text-gray-400 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    <span>Recent Output ({lastOutput.length} lines)</span>
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(lastOutput.join('\n'))}
                    className="text-primary-orange hover:text-orange-400 text-[10px] transition-colors cursor-pointer"
                    title="Copy terminal output"
                  >
                    Copy
                  </button>
                </div>
                <div className="font-mono text-xs text-green-400 space-y-1 max-h-64 overflow-y-auto">
                  {lastOutput.length > 0 ? (
                    lastOutput.map((line, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="whitespace-pre-wrap break-all"
                      >
                        {line}
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-gray-600">Waiting for output...</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

