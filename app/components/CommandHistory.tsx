'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Clock, Terminal, X, ChevronRight } from 'lucide-react'

interface CommandHistoryProps {
  isOpen: boolean
  onClose: () => void
  onSelectCommand: (command: string) => void
  commandHistory: string[]
}

export default function CommandHistory({ 
  isOpen, 
  onClose, 
  onSelectCommand, 
  commandHistory 
}: CommandHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredCommands, setFilteredCommands] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchTerm) {
      const filtered = commandHistory.filter(cmd => 
        cmd.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredCommands(filtered.reverse())
    } else {
      setFilteredCommands([...commandHistory].reverse())
    }
    setSelectedIndex(0)
  }, [searchTerm, commandHistory])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault()
      onSelectCommand(filteredCommands[selectedIndex])
      onClose()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[600px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-primary-orange" />
              <h2 className="text-lg font-semibold text-white">Command History</h2>
              <span className="text-xs text-gray-400">
                {filteredCommands.length} / {commandHistory.length} commands
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search command history... (Ctrl+R like)"
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-orange transition-colors"
              />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              ↑↓ Navigate • Enter Select • Esc Close
            </div>
          </div>

          {/* Command List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredCommands.length > 0 ? (
              <div className="space-y-1">
                {filteredCommands.map((cmd, index) => (
                  <motion.button
                    key={`${cmd}-${index}`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      onSelectCommand(cmd)
                      onClose()
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                      index === selectedIndex
                        ? 'bg-primary-orange text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-mono text-sm flex-1 truncate">{cmd}</span>
                      {index === selectedIndex && (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Terminal className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No commands found</p>
                <p className="text-xs mt-1">
                  {searchTerm ? 'Try a different search term' : 'Start typing commands to build history'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>💡 Tip: Use Ctrl+R in terminal for quick search</span>
              <span>{commandHistory.length} total commands</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

