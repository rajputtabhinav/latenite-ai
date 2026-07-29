'use client'

import { motion } from 'framer-motion'
import { RefreshCw, X, Wifi, Clock, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReconnectProgress } from '../lib/ssh-auto-reconnect'

interface ReconnectionBannerProps {
  isReconnecting: boolean
  progress: ReconnectProgress | null
  host: string
  username: string
  onCancel: () => void
}

export default function ReconnectionBanner({
  isReconnecting,
  progress,
  host,
  username,
  onCancel
}: ReconnectionBannerProps) {
  const [countdown, setCountdown] = useState(30)
  const [elapsedDisplay, setElapsedDisplay] = useState('0:00')
  const [remainingDisplay, setRemainingDisplay] = useState('10:00')

  useEffect(() => {
    if (!progress) return

    // Update countdown for next retry
    let count = Math.floor(progress.nextRetryIn / 1000)
    setCountdown(count)
    
    const interval = setInterval(() => {
      count--
      if (count < 0) count = 0
      setCountdown(count)
    }, 1000)
    
    // Update elapsed and remaining time displays
    const elapsed = Math.floor(progress.elapsedTime / 1000)
    const elapsedMins = Math.floor(elapsed / 60)
    const elapsedSecs = elapsed % 60
    setElapsedDisplay(`${elapsedMins}:${elapsedSecs.toString().padStart(2, '0')}`)
    
    const remaining = Math.floor((progress.maxDuration - progress.elapsedTime) / 1000)
    const remainingMins = Math.floor(remaining / 60)
    const remainingSecs = remaining % 60
    setRemainingDisplay(`${remainingMins}:${remainingSecs.toString().padStart(2, '0')}`)

    return () => clearInterval(interval)
  }, [progress])

  if (!isReconnecting || !progress) return null

  const progressPercent = (progress.attempt / progress.maxAttempts) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-primary-orange to-orange-600 backdrop-blur-sm px-6 py-4 z-50 shadow-lg border-b-2 border-orange-700"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="flex-shrink-0"
            >
              <RefreshCw className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <div className="text-white font-bold text-lg flex items-center space-x-2">
                <span>Auto-Reconnecting SSH</span>
                <Wifi className="w-5 h-5" />
              </div>
              <div className="text-white/90 text-sm">
                {username}@{host}
              </div>
            </div>
          </div>
          
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Cancel auto-reconnect"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-white/90 text-sm font-medium">
              {progress.status === 'waiting' && '⏱️ Waiting for server to boot...'}
              {progress.status === 'connecting' && '🔌 Attempting connection...'}
              {progress.status === 'connected' && '✅ Connected!'}
              {progress.status === 'failed' && '❌ Connection failed'}
            </div>
            <div className="text-white/90 text-sm font-mono">
              Attempt {progress.attempt}/{progress.maxAttempts}
            </div>
          </div>
          
          <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-white rounded-full shadow-lg"
            />
          </div>
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-3 gap-4 text-white/90 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <div>
              <div className="text-xs text-white/70">Elapsed</div>
              <div className="font-mono font-medium">{elapsedDisplay}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <div>
              <div className="text-xs text-white/70">Remaining</div>
              <div className="font-mono font-medium">{remainingDisplay}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <div>
              <div className="text-xs text-white/70">Next retry in</div>
              <div className="font-mono font-medium">{countdown}s</div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {progress.message && (
          <div className="mt-3 flex items-start space-x-2 text-white/90 text-sm bg-white/10 rounded-lg p-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div>{progress.message}</div>
              <div className="text-xs text-white/70 mt-1">
                💡 Most servers take 2-5 minutes to fully boot
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

