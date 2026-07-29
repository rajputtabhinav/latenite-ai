'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Link2, PlusCircle, Users, Server, Clock, X, Wifi } from 'lucide-react'

interface SessionChoiceModalProps {
  isOpen: boolean
  existingSessions: Array<{
    sessionId: string
    host: string
    username: string
    createdAt: number
    tabName: string
  }>
  onUseExisting: (sessionId: string) => void
  onCreateNew: () => void
  onClose: () => void
}

export default function SessionChoiceModal({
  isOpen,
  existingSessions,
  onUseExisting,
  onCreateNew,
  onClose
}: SessionChoiceModalProps) {
  if (!isOpen || existingSessions.length === 0) return null

  const formatTimeAgo = (timestamp: number): string => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border-2 border-primary-orange rounded-xl w-full max-w-lg overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-orange to-orange-600 px-6 py-4 relative">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-lg font-bold text-white">SSH Session Detected</h3>
                <p className="text-white/80 text-sm">
                  {existingSessions.length} active session{existingSessions.length > 1 ? 's' : ''} found in other tab{existingSessions.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Existing Sessions */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-400 mb-3">
                Choose an existing session or create new:
              </div>
              
              {existingSessions.map((session, index) => (
                <motion.div
                  key={session.sessionId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onUseExisting(session.sessionId)}
                    className="w-full bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-primary-orange rounded-lg p-4 transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-primary-orange/20 rounded-lg flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-primary-orange" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">Use This Session</div>
                          <div className="text-xs text-gray-400">{session.tabName}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-green-400 text-xs">
                        <Wifi className="w-3 h-3" />
                        <span>Active</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pl-12">
                      <div className="flex items-center space-x-2 text-sm">
                        <Server className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400">Host:</span>
                        <span className="font-mono text-primary-orange">{session.host}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400">User:</span>
                        <span className="font-mono text-white">{session.username}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(session.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                      💡 Terminal output will be synced across tabs
                    </div>
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-900 px-3 text-sm text-gray-400">OR</span>
              </div>
            </div>

            {/* New Connection Option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateNew}
              className="w-full bg-gradient-to-r from-primary-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg p-4 transition-all flex items-center space-x-3 shadow-lg border-2 border-transparent hover:border-orange-400"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-base">Create New Connection</div>
                <div className="text-white/90 text-sm mt-1">
                  Connect to a different server or use different credentials
                </div>
              </div>
            </motion.button>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start space-x-2 text-sm text-blue-300">
                <span className="text-lg flex-shrink-0">💡</span>
                <div>
                  <span className="font-medium">Multi-Tab Sessions:</span> You can have multiple independent SSH connections in different tabs for working with multiple servers simultaneously.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

