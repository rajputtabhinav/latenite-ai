/**
 * AgentMessage Component - Completely Rewritten
 * Robust message rendering with guaranteed persistence
 * Clean, professional UI following Cline's principles
 */

'use client'

import React, { forwardRef, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Copy, Check, User, Code, Globe, ExternalLink, Clock } from 'lucide-react'
import MessageRenderer from './MessageRenderer'
import type { AIMessage } from '../../types'

interface AgentMessageProps {
  message: AIMessage
  onCopy: (content: string, messageId: string) => void
  onInsertCode?: (code: string) => void
  isCopied?: boolean
  messageIndex: number
  totalMessages: number
}

const AgentMessageNew = forwardRef<HTMLDivElement, AgentMessageProps>(({
  message,
  onCopy,
  onInsertCode,
  isCopied,
  messageIndex,
  totalMessages
}, ref) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  
  // State for expandable citations
  const [showAllCitations, setShowAllCitations] = useState(false)

  // Extract code blocks (memoized for performance)
  const extractCode = (content: string): string | null => {
    const codeBlockMatch = content.match(/```[\s\S]*?```/g)
    if (codeBlockMatch) {
      return codeBlockMatch
        .map(block => block.replace(/```\w*\n?/, '').replace(/\n?```$/, ''))
        .join('\n\n')
    }
    return null
  }

  // Memoize expensive computations
  const hasCode = useMemo(() => extractCode(message.content) !== null, [message.content])
  
  const formattedTime = useMemo(() => {
    return message.timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }, [message.timestamp])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2 w-full`}
      data-message-id={message.id}
      data-message-index={messageIndex}
    >
      <div className={`max-w-[85%] min-w-[200px] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Assistant Header */}
        {isAssistant && (
          <div className="flex items-center space-x-2 mb-1 px-1">
            <div className="relative">
              <div className="w-5 h-5 bg-gradient-to-br from-primary-orange to-orange-600 rounded-full flex items-center justify-center shadow-md">
                <Bot className="w-3 h-3 text-white" aria-hidden="true" />
              </div>
              {message.isStreaming && (
                <div className="absolute -top-0.5 -right-0.5">
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-white">Latenite AI</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400 flex items-center space-x-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                <span>{formattedTime}</span>
              </span>
              {message.isStreaming && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-yellow-400">Working...</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Message Bubble - ZERO PADDING for maximum content density */}
        <div
          className={`relative px-0 py-0 rounded-2xl overflow-hidden ${
            isUser
              ? 'bg-gradient-to-r from-primary-orange to-orange-600 text-white shadow-lg'
              : 'bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 shadow-md'
          }`}
        >
          {/* Message Content - Zero padding, ensure visibility */}
          <div className="relative p-2.5">
            <MessageRenderer
              content={message.content}
              isTyping={message.isTyping && !message.isStreaming}
              onTypingComplete={() => {}}
              isStreaming={message.isStreaming}
              className={isUser ? 'text-white !text-white' : 'text-gray-100 !text-gray-100'}
            />
          </div>

          {/* Web Search Citations */}
          {isAssistant && message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-3 h-3 text-primary-orange" />
                <span className="text-xs font-medium text-gray-300">
                  Sources ({message.citations.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {message.citations
                  .slice(0, showAllCitations ? message.citations.length : 3)
                  .map((citation, i) => (
                    <motion.a
                      key={i}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start space-x-2 text-xs group hover:bg-gray-700/30 p-2 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-primary-orange mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-primary-orange group-hover:text-orange-400 font-medium truncate">
                          {citation.title}
                        </div>
                        {citation.snippet && (
                          <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                            {citation.snippet}
                          </div>
                        )}
                      </div>
                    </motion.a>
                  ))}
                {message.citations.length > 3 && (
                  <button
                    onClick={() => setShowAllCitations(!showAllCitations)}
                    className="text-xs text-primary-orange hover:text-orange-400 pl-7 transition-colors underline cursor-pointer"
                  >
                    {showAllCitations 
                      ? 'Show less' 
                      : `Show ${message.citations.length - 3} more sources`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Message Actions (Assistant only) */}
          {isAssistant && !message.isStreaming && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-700/30">
              <div className="flex items-center space-x-2">
                {hasCode && (
                  <div className="text-xs text-gray-400 flex items-center space-x-1">
                    <Code className="w-3 h-3" />
                    <span>Code</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Insert Code Button */}
                {hasCode && onInsertCode && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const code = extractCode(message.content)
                      if (code) onInsertCode(code)
                    }}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-600 transition-colors flex items-center space-x-1"
                  >
                    <Code className="w-3 h-3" />
                    <span>Insert</span>
                  </motion.button>
                )}

                {/* Copy Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onCopy(message.content, message.id)}
                  aria-label="Copy message"
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-600 transition-colors flex items-center space-x-1"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" aria-hidden="true" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* User Timestamp */}
        {isUser && (
          <div className="text-xs text-gray-500 mt-0.5 text-right px-3">
            {formattedTime}
          </div>
        )}
      </div>
    </motion.div>
  )
})

AgentMessageNew.displayName = 'AgentMessageNew'

// Memoize component to prevent unnecessary re-renders
export default React.memo(AgentMessageNew, (prev, next) => {
  return prev.message.id === next.message.id &&
         prev.message.content === next.message.content &&
         prev.message.isStreaming === next.message.isStreaming &&
         prev.isCopied === next.isCopied
})
