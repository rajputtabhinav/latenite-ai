'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Pause, Play, X, CheckCircle, Loader, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'

interface LongRunningTask {
  id: string
  description: string
  type: 'streaming' | 'background' | 'long_running' | 'multi_day'
  status: string
  progress?: number
  currentStep?: number
  totalSteps?: number
  startTime: number
  estimatedCompletion?: number
  latestOutput?: string
}

interface LongRunningTaskPanelProps {
  tasks: LongRunningTask[]
  onPause: (taskId: string) => void
  onResume: (taskId: string) => void
  onCancel: (taskId: string) => void
  onViewDetails: (taskId: string) => void
}

export default function LongRunningTaskPanel({
  tasks,
  onPause,
  onResume,
  onCancel,
  onViewDetails
}: LongRunningTaskPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  if (tasks.length === 0) return null
  
  return (
    <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
      <div className="px-4 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between mb-2 hover:bg-gray-800/50 rounded p-1 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-gray-300">
              Long-Running Tasks ({tasks.length})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          )}
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 overflow-hidden"
            >
              {tasks.map((task) => (
                <TaskCard 
                  key={task.id}
                  task={task}
                  onPause={onPause}
                  onResume={onResume}
                  onCancel={onCancel}
                  onViewDetails={onViewDetails}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TaskCard({ task, onPause, onResume, onCancel, onViewDetails }: {
  task: LongRunningTask
  onPause: (taskId: string) => void
  onResume: (taskId: string) => void
  onCancel: (taskId: string) => void
  onViewDetails: (taskId: string) => void
}) {
  const [elapsed, setElapsed] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Date.now() - task.startTime)
    }, 1000)
    return () => clearInterval(timer)
  }, [task.startTime])
  
  const formatDuration = (ms: number) => {
    const days = Math.floor(ms / 86400000)
    const hours = Math.floor((ms % 86400000) / 3600000)
    const mins = Math.floor((ms % 3600000) / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }
  
  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'multi_day': return 'text-purple-400 border-purple-500/30 bg-purple-500/5'
      case 'long_running': return 'text-blue-400 border-blue-500/30 bg-blue-500/5'
      case 'background': return 'text-green-400 border-green-500/30 bg-green-500/5'
      case 'streaming': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5'
      default: return 'text-gray-400 border-gray-700 bg-gray-800'
    }
  }
  
  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'multi_day': return '🗓️ Multi-Day'
      case 'long_running': return '⏳ Long-Running'
      case 'background': return '🔄 Background'
      case 'streaming': return '📡 Streaming'
      default: return '📋 Task'
    }
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`border rounded-lg p-3 ${getTaskTypeColor(task.type)}`}
    >
      {/* Task Info */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-gray-500">{getTaskTypeLabel(task.type)}</span>
            {task.status === 'running' || task.status === 'monitoring' ? (
              <Loader className="w-3 h-3 text-cyan-400 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3 text-green-400" />
            )}
          </div>
          <div className="text-sm font-medium text-white truncate">
            {task.description}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">
                {formatDuration(elapsed)}
              </span>
            </div>
            {task.type === 'multi_day' && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-purple-400">
                  Day {Math.floor(elapsed / 86400000) + 1}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      {task.progress !== undefined && task.progress > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Progress</span>
            <span className="text-xs font-medium text-white">{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            />
          </div>
        </div>
      )}
      
      {/* Step Counter */}
      {task.currentStep && task.totalSteps && (
        <div className="text-xs text-gray-400 mb-2">
          Step {task.currentStep}/{task.totalSteps}
        </div>
      )}
      
      {/* Latest Output Preview */}
      {task.latestOutput && (
        <div className="mb-2 bg-black/30 rounded p-2 max-h-12 overflow-hidden">
          <div className="text-[10px] font-mono text-gray-400 truncate">
            {task.latestOutput}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => onViewDetails(task.id)}
          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          Details
        </button>
        
        {task.status === 'running' && (
          <button
            onClick={() => onPause(task.id)}
            className="text-xs px-2 py-1 rounded bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 transition-colors flex items-center gap-1"
          >
            <Pause className="w-3 h-3" />
            Pause
          </button>
        )}
        
        {task.status === 'paused' && (
          <button
            onClick={() => onResume(task.id)}
            className="text-xs px-2 py-1 rounded bg-green-600/20 hover:bg-green-600/30 text-green-400 transition-colors flex items-center gap-1"
          >
            <Play className="w-3 h-3" />
            Resume
          </button>
        )}
        
        <button
          onClick={() => onCancel(task.id)}
          className="text-xs px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

