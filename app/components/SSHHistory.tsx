'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Wifi, ChevronDown, Trash2 } from 'lucide-react'

interface SSHConnection {
  id: string
  host: string
  username: string
  timestamp: number
  status: 'connected' | 'disconnected'
}

interface SSHHistoryProps {
  onConnect: (connection: { host: string; username: string }) => void
  currentConnection?: { host: string; username: string } | null
  isConnected: boolean
}

export default function SSHHistory({ onConnect, currentConnection, isConnected }: SSHHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connections, setConnections] = useState<SSHConnection[]>([])

  // Load SSH history from localStorage on component mount
  useEffect(() => {
    const savedConnections = localStorage.getItem('ssh-history')
    if (savedConnections) {
      try {
        const parsed = JSON.parse(savedConnections)
        setConnections(parsed)
      } catch (error) {
        console.error('Failed to parse SSH history:', error)
      }
    }
  }, [])

  // Save SSH history to localStorage whenever connections change
  useEffect(() => {
    localStorage.setItem('ssh-history', JSON.stringify(connections))
  }, [connections])

  // Add a new connection to history
  const addConnection = (host: string, username: string) => {
    const newConnection: SSHConnection = {
      id: `${host}-${username}-${Date.now()}`,
      host,
      username,
      timestamp: Date.now(),
      status: 'connected'
    }

    setConnections(prev => {
      // Remove duplicate entries for the same host/username
      const filtered = prev.filter(conn => !(conn.host === host && conn.username === username))
      // Add new connection at the beginning and limit to 10 entries
      return [newConnection, ...filtered].slice(0, 10)
    })
  }

  // Update connection status
  const updateConnectionStatus = (host: string, username: string, status: 'connected' | 'disconnected') => {
    setConnections(prev =>
      prev.map(conn =>
        conn.host === host && conn.username === username
          ? { ...conn, status, timestamp: Date.now() }
          : { ...conn, status: conn.status === 'connected' ? 'disconnected' : conn.status }
      )
    )
  }

  // Remove a connection from history
  const removeConnection = (id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id))
  }

  // Clear all history
  const clearHistory = () => {
    setConnections([])
  }

  // Handle connection click
  const handleConnect = (connection: SSHConnection) => {
    onConnect({ host: connection.host, username: connection.username })
    setIsOpen(false)
  }

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }

  // Expose methods to parent components
  useEffect(() => {
    // Store methods in window for access by parent components
    (window as any).sshHistory = {
      addConnection,
      updateConnectionStatus
    }
  }, [])

  return (
    <div className="relative">
      {/* SSH History Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
          connections.length > 0
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        disabled={connections.length === 0}
      >
        <Clock className="w-4 h-4" />
        <span className="hidden sm:inline">
          {connections.length > 0 ? `${connections.length} SSH` : 'No History'}
        </span>
        {connections.length > 0 && (
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </motion.button>

      {/* SSH History Dropdown */}
      <AnimatePresence>
        {isOpen && connections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-600 z-[9999] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-primary-orange" />
                  <span className="text-sm font-medium text-white">SSH Connection History</span>
                </div>
                {connections.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Connections List */}
            <div className="max-h-64 overflow-y-auto">
              {connections.map((connection) => (
                <motion.div
                  key={connection.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`px-4 py-3 border-b border-gray-700 last:border-0 hover:bg-gray-700 cursor-pointer transition-colors ${
                    currentConnection?.host === connection.host && 
                    currentConnection?.username === connection.username &&
                    isConnected ? 'bg-green-900/20' : ''
                  }`}
                  onClick={() => handleConnect(connection)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Wifi className={`w-3 h-3 flex-shrink-0 ${
                          currentConnection?.host === connection.host && 
                          currentConnection?.username === connection.username &&
                          isConnected ? 'text-green-400' : 'text-gray-400'
                        }`} />
                        <span className="text-sm font-medium text-white truncate">
                          {connection.username}@{connection.host}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {formatTime(connection.timestamp)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          currentConnection?.host === connection.host && 
                          currentConnection?.username === connection.username &&
                          isConnected
                            ? 'bg-green-900 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {currentConnection?.host === connection.host && 
                           currentConnection?.username === connection.username &&
                           isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeConnection(connection.id)
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-gray-900 px-4 py-2 border-t border-gray-600">
              <p className="text-xs text-gray-400 text-center">
                Click any connection to reconnect
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 