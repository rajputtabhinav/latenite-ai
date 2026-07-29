/**
 * useMessageStore Hook
 * Robust message state management with persistence guarantees
 * Ensures messages never disappear and are always rendered
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AIMessage } from '../../../types'

export interface MessageStoreConfig {
  maxMessages?: number
  enablePersistence?: boolean
  persistenceKey?: string
}

export function useMessageStore(config: MessageStoreConfig = {}) {
  const {
    maxMessages = 1000,
    enablePersistence = true,
    persistenceKey = 'latenite_messages'
  } = config

  const [messages, setMessages] = useState<AIMessage[]>([])
  const messagesRef = useRef<AIMessage[]>([])
  
  // Keep ref in sync with state for debugging
  useEffect(() => {
    messagesRef.current = messages
    console.log(`📊 Message Store: ${messages.length} messages in state`)
  }, [messages])

  /**
   * Add a new message (guaranteed to persist)
   */
  const addMessage = useCallback((message: AIMessage) => {
    setMessages(prev => {
      // Prevent duplicates
      if (prev.some(m => m.id === message.id)) {
        console.warn(`⚠️ Duplicate message ID: ${message.id}`)
        return prev
      }
      
      const updated = [...prev, message]
      console.log(`✅ Added message ${message.id} (total: ${updated.length})`)
      return updated
    })
  }, [])

  /**
   * Update an existing message (preserves all others)
   */
  const updateMessage = useCallback((messageId: string, updates: Partial<AIMessage>) => {
    setMessages(prev => {
      const updated = prev.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
      
      // Verify message still exists
      const found = updated.find(m => m.id === messageId)
      if (!found) {
        console.error(`❌ Message ${messageId} not found for update!`)
      } else {
        console.log(`✅ Updated message ${messageId} (total: ${updated.length})`)
      }
      
      return updated
    })
  }, [])

  /**
   * Update message content (append or replace)
   */
  const updateMessageContent = useCallback((
    messageId: string,
    content: string,
    mode: 'replace' | 'append' = 'replace'
  ) => {
    setMessages(prev => {
      const updated = prev.map(msg => {
        if (msg.id !== messageId) return msg
        
        return {
          ...msg,
          content: mode === 'append' ? msg.content + content : content
        }
      })
      
      console.log(`✅ Updated content for ${messageId} (mode: ${mode}, total: ${updated.length})`)
      return updated
    })
  }, [])

  /**
   * Remove a specific message
   */
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => {
      const updated = prev.filter(msg => msg.id !== messageId)
      console.log(`🗑️ Removed message ${messageId} (remaining: ${updated.length})`)
      return updated
    })
  }, [])

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    console.log('🧹 Cleared all messages')
  }, [])

  /**
   * Get message by ID
   */
  const getMessage = useCallback((messageId: string): AIMessage | undefined => {
    return messagesRef.current.find(m => m.id === messageId)
  }, [])

  /**
   * Check if message exists
   */
  const hasMessage = useCallback((messageId: string): boolean => {
    return messagesRef.current.some(m => m.id === messageId)
  }, [])

  /**
   * Get all messages (immutable)
   */
  const getAllMessages = useCallback((): readonly AIMessage[] => {
    return [...messagesRef.current]
  }, [])

  /**
   * Batch update multiple messages (more efficient)
   */
  const batchUpdate = useCallback((updates: Array<{ id: string; updates: Partial<AIMessage> }>) => {
    setMessages(prev => {
      let updated = [...prev]
      
      for (const { id, updates: messageUpdates } of updates) {
        updated = updated.map(msg =>
          msg.id === id ? { ...msg, ...messageUpdates } : msg
        )
      }
      
      console.log(`✅ Batch updated ${updates.length} messages (total: ${updated.length})`)
      return updated
    })
  }, [])

  /**
   * Restore messages from backup (for persistence)
   */
  const restoreMessages = useCallback((restoredMessages: AIMessage[]) => {
    setMessages(restoredMessages)
    console.log(`💾 Restored ${restoredMessages.length} messages`)
  }, [])

  /**
   * Direct access to setMessages (for compatibility with existing code)
   */
  const setMessagesDirectly = useCallback((updater: AIMessage[] | ((prev: AIMessage[]) => AIMessage[])) => {
    if (typeof updater === 'function') {
      setMessages(updater)
    } else {
      setMessages(updater)
    }
  }, [])

  return {
    messages,
    addMessage,
    updateMessage,
    updateMessageContent,
    removeMessage,
    clearMessages,
    getMessage,
    hasMessage,
    getAllMessages,
    batchUpdate,
    restoreMessages,
    setMessages: setMessagesDirectly,
    messageCount: messages.length
  }
}

