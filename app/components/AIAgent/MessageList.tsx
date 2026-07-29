/**
 * MessageList Component
 * Handles message display with proper scrolling and persistence
 * Ensures all messages remain visible
 */

'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, MessageSquare } from 'lucide-react'
import AgentMessageNew from './AgentMessageNew'
import type { AIMessage } from '../../types'

interface MessageListProps {
  messages: AIMessage[]
  onCopy: (content: string, messageId: string) => void
  onInsertCode?: (code: string) => void
  copiedId: string | null
}

export default function MessageList({
  messages,
  onCopy,
  onInsertCode,
  copiedId
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)

  // Auto-scroll to bottom when new messages arrive (only if already near bottom)
  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isNearBottom])

  // Check scroll position to show/hide scroll-to-top button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Show button if scrolled up more than 200px
    setShowScrollTop(scrollTop > 200)

    // Check if near bottom (within 100px)
    setIsNearBottom(distanceFromBottom < 100)
  }, [])

  // Scroll to top
  const scrollToTop = useCallback(() => {
    messagesContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Log message count for debugging
  useEffect(() => {
    console.log(`📊 MessageList: Rendering ${messages.length} messages`)
  }, [messages.length])

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Message Count Indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-full px-3 py-1 flex items-center space-x-1.5 shadow-lg">
          <MessageSquare className="w-3 h-3 text-primary-orange" />
          <span className="text-xs text-gray-300 font-medium">{messages.length}</span>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-1 px-2 scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(249, 115, 22, 0.3) rgba(31, 41, 55, 0.3)'
        }}
      >
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <AgentMessageNew
                key={message.id}
                message={message}
                onCopy={onCopy}
                onInsertCode={onInsertCode}
                isCopied={copiedId === message.id}
                messageIndex={index}
                totalMessages={messages.length}
              />
            ))}
          </AnimatePresence>

          {/* Extra padding at bottom */}
          <div className="h-4" />
        </div>

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="absolute bottom-4 right-4 w-10 h-10 bg-primary-orange hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-20"
            title="Scroll to top"
          >
            <ChevronUp className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Not at bottom indicator */}
      {!isNearBottom && messages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10"
        >
          <button
            onClick={scrollToBottom}
            className="bg-gray-800/95 backdrop-blur-sm border border-primary-orange/30 rounded-full px-4 py-2 flex items-center space-x-2 shadow-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-xs text-white font-medium">New messages below</span>
            <ChevronUp className="w-3 h-3 text-primary-orange rotate-180" />
          </button>
        </motion.div>
      )}
    </div>
  )
}

