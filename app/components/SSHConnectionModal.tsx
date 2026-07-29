'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SSHCredentials {
  host: string
  username: string
  password: string
  keyContent: string
  useKey: boolean
}

interface SSHConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (credentials: SSHCredentials) => Promise<void>
  initialCredentials?: Partial<SSHCredentials>
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error'
}

export default function SSHConnectionModal({
  isOpen,
  onClose,
  onConnect,
  initialCredentials = {},
  connectionStatus
}: SSHConnectionModalProps) {
  const [credentials, setCredentials] = useState<SSHCredentials>({
    host: initialCredentials.host || '',
    username: initialCredentials.username || '',
    password: '',
    keyContent: '',
    useKey: false
  })

  const hostInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const hasAutoFocused = useRef(false)

  // Update credentials if initialCredentials change
  useEffect(() => {
    if (initialCredentials.host || initialCredentials.username) {
      setCredentials(prev => ({
        ...prev,
        host: initialCredentials.host || prev.host,
        username: initialCredentials.username || prev.username
      }))
    }
  }, [initialCredentials])

  // Auto-focus first empty field when modal opens - ONCE only
  useEffect(() => {
    if (isOpen && !hasAutoFocused.current) {
      hasAutoFocused.current = true
      setTimeout(() => {
        if (!credentials.host && hostInputRef.current) {
          hostInputRef.current.focus()
        } else if (credentials.host && credentials.username && passwordInputRef.current) {
          passwordInputRef.current.focus()
        } else if (hostInputRef.current) {
          hostInputRef.current.focus()
        }
      }, 150)
    } else if (!isOpen) {
      // Reset the flag when modal closes
      hasAutoFocused.current = false
    }
  }, [isOpen])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    
    const isValid = credentials.host && 
                    credentials.username && 
                    (credentials.useKey ? credentials.keyContent : credentials.password)
    
    if (isValid && connectionStatus !== 'connecting') {
      onConnect(credentials)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent event from bubbling to parent components
    e.stopPropagation()
    
    // Handle Enter key to submit form
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    
    // Handle Escape key to close modal
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="ssh-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => {
            // Only close when clicking the backdrop itself
            if (e.target === e.currentTarget) {
              onClose()
            }
          }}
          onMouseDown={(e) => {
            // Prevent any mouse events from bubbling
            if (e.target === e.currentTarget) {
              e.stopPropagation()
            }
          }}
        >
          <motion.div
            key="ssh-modal-content"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">🔐 SSH Connection</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
                type="button"
              >
                ✕
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Host and Username Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 text-xs mb-1.5 font-medium">Host</label>
                  <input
                    ref={hostInputRef}
                    type="text"
                    value={credentials.host}
                    onChange={(e) => setCredentials(prev => ({ ...prev, host: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    placeholder="172.16.12.79"
                    className="w-full bg-gray-700 text-white px-3 py-2 text-sm rounded border border-gray-600 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none transition-all"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs mb-1.5 font-medium">Username</label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    placeholder="asus"
                    className="w-full bg-gray-700 text-white px-3 py-2 text-sm rounded border border-gray-600 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none transition-all"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Authentication Method Toggle */}
              <div className="flex space-x-1 bg-gray-900 rounded-lg p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCredentials(prev => ({ ...prev, useKey: false }))
                  }}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                    !credentials.useKey 
                      ? 'bg-primary-orange text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCredentials(prev => ({ ...prev, useKey: true }))
                  }}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                    credentials.useKey 
                      ? 'bg-primary-orange text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  SSH Key
                </button>
              </div>
              
              {/* Password or SSH Key Input */}
              {!credentials.useKey ? (
                <div>
                  <label className="block text-gray-300 text-xs mb-1.5 font-medium">Password</label>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Enter password"
                    autoFocus={!!credentials.host && !!credentials.username}
                    autoComplete="current-password"
                    className="w-full bg-gray-700 text-white px-3 py-2 text-sm rounded border border-gray-600 focus:border-primary-orange focus:ring-2 focus:ring-primary-orange outline-none transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-gray-300 text-xs mb-1.5 font-medium">SSH Private Key</label>
                  <textarea
                    value={credentials.keyContent}
                    onChange={(e) => setCredentials(prev => ({ ...prev, keyContent: e.target.value }))}
                    onKeyDown={(e) => {
                      // Allow normal textarea behavior but stop propagation
                      e.stopPropagation()
                      // Don't prevent default for Escape, let handleKeyDown handle it
                      if (e.key === 'Escape') {
                        handleKeyDown(e)
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;Paste your private key here...&#10;-----END RSA PRIVATE KEY-----"
                    autoFocus={!!credentials.host && !!credentials.username}
                    className="w-full bg-gray-700 text-white px-3 py-2 text-xs rounded border border-gray-600 focus:border-primary-orange focus:ring-2 focus:ring-primary-orange outline-none font-mono transition-all resize-none"
                    rows={6}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center space-x-3 mt-6 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onClose()
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !credentials.host || 
                    !credentials.username || 
                    connectionStatus === 'connecting' ||
                    (credentials.useKey && !credentials.keyContent) ||
                    (!credentials.useKey && !credentials.password)
                  }
                  className="flex-1 bg-primary-orange hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 text-sm rounded font-medium transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  {connectionStatus === 'connecting' ? (
                    <span className="flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Connecting...
                    </span>
                  ) : 'Connect'}
                </button>
              </div>
            </form>

            {/* Connection Status Indicator */}
            {connectionStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs text-center"
              >
                ❌ Connection failed. Please check your credentials.
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

