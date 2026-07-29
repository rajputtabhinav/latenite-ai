'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Loader, Clock, AlertCircle, Info, XCircle } from 'lucide-react'

export interface TimelineEvent {
  timestamp: number
  title: string
  description: string
  type: 'start' | 'checkpoint' | 'progress' | 'complete' | 'error' | 'info'
}

interface TaskTimelineProps {
  taskId: string
  events: TimelineEvent[]
  isLive?: boolean
}

export default function TaskTimeline({ taskId, events, isLive = true }: TaskTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-gray-500">
        No timeline events yet
      </div>
    )
  }
  
  return (
    <div className="relative space-y-3 py-3">
      {/* Timeline Line */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-700" />
      
      {events.map((event, index) => (
        <TimelineEventCard 
          key={index} 
          event={event} 
          index={index}
          isLatest={isLive && index === events.length - 1}
        />
      ))}
    </div>
  )
}

function TimelineEventCard({ event, index, isLatest }: {
  event: TimelineEvent
  index: number
  isLatest: boolean
}) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'complete':
        return <CheckCircle className="w-3 h-3 text-white" />
      case 'error':
        return <XCircle className="w-3 h-3 text-white" />
      case 'checkpoint':
        return <Clock className="w-3 h-3 text-white" />
      case 'progress':
        return <Loader className="w-3 h-3 text-white animate-spin" />
      case 'info':
        return <Info className="w-3 h-3 text-white" />
      default:
        return <div className="w-1.5 h-1.5 bg-white rounded-full" />
    }
  }
  
  const getEventColor = (type: string) => {
    switch (type) {
      case 'complete':
        return 'bg-green-600 ring-green-500/30'
      case 'error':
        return 'bg-red-600 ring-red-500/30'
      case 'checkpoint':
        return 'bg-blue-600 ring-blue-500/30'
      case 'progress':
        return 'bg-yellow-600 ring-yellow-500/30'
      case 'info':
        return 'bg-cyan-600 ring-cyan-500/30'
      default:
        return 'bg-gray-600 ring-gray-500/30'
    }
  }
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative pl-8"
    >
      {/* Timeline Dot */}
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${getEventColor(event.type)} ${
        isLatest ? 'ring-4 animate-pulse' : ''
      }`}>
        {getEventIcon(event.type)}
      </div>
      
      {/* Event Content */}
      <motion.div
        className={`bg-gray-800/50 border rounded-lg p-2.5 ${
          isLatest ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-700'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white">{event.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">{event.description}</div>
          </div>
          <span className="text-[10px] text-gray-500 whitespace-nowrap">
            {formatTime(event.timestamp)}
          </span>
        </div>
        
        {isLatest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-1 text-[10px] text-cyan-400"
          >
            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
            <span>Live</span>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

