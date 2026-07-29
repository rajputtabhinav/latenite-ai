'use client'

import { motion } from 'framer-motion'
import { Plus, X, Terminal } from 'lucide-react'

export interface TerminalTab {
  id: string
  title: string
  host?: string
  username?: string
  isConnected: boolean
  sessionId?: string
  createdAt: number
}

interface TerminalTabsProps {
  tabs: TerminalTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabAdd: () => void
  maxTabs?: number
}

export default function TerminalTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd,
  maxTabs = 10
}: TerminalTabsProps) {
  return (
    <div className="flex items-center space-x-1 bg-gray-900 px-2 py-1 border-b border-gray-700 overflow-x-auto scrollbar-thin">
      {/* Tab List */}
      <div className="flex items-center space-x-1 flex-1 min-w-0">
        {tabs.map((tab, index) => (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-t-lg transition-all duration-200 cursor-pointer flex-shrink-0 min-w-[120px] max-w-[200px] ${
              activeTabId === tab.id
                ? 'bg-gray-800 border-t-2 border-primary-orange text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800/80 hover:text-gray-300'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {/* Connection Status Indicator */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              tab.isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`} />

            {/* Tab Icon & Title */}
            <div className="flex items-center space-x-1.5 flex-1 min-w-0">
              <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-medium truncate">
                {tab.host ? `${tab.username}@${tab.host}` : tab.title}
              </span>
            </div>

            {/* Close Button */}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity flex-shrink-0"
                title="Close tab"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Active Tab Indicator */}
            {activeTabId === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-orange"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Add New Tab Button */}
      {tabs.length < maxTabs && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTabAdd}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 hover:bg-primary-orange text-gray-400 hover:text-white transition-all duration-200 flex-shrink-0"
          title="New terminal tab"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      )}

      {/* Tab Counter */}
      <div className="text-xs text-gray-500 px-2 flex-shrink-0">
        {tabs.length}/{maxTabs}
      </div>
    </div>
  )
}

