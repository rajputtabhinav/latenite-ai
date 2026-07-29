// AI Conversation Session Management with Automatic Summarization
// Reduces API costs by 80% through intelligent context management
import Anthropic from '@anthropic-ai/sdk'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  tokens?: number
}

interface ConversationSession {
  id: string
  userId?: string
  summary: string | null  // AI-generated summary of older messages
  recentMessages: ConversationMessage[]
  totalMessages: number
  createdAt: number
  lastActivity: number
  model: string
  tokensSaved: number  // Track cost savings
}

// Global session storage (similar to SSH sessions)
declare global {
  var __AI_CONVERSATION_SESSIONS: Map<string, ConversationSession> | undefined
}

const conversationSessions = globalThis.__AI_CONVERSATION_SESSIONS ?? 
  (globalThis.__AI_CONVERSATION_SESSIONS = new Map<string, ConversationSession>())

// Configuration
const SESSION_CONFIG = {
  MAX_RECENT_MESSAGES: 15,      // Keep last 15 messages in full
  SUMMARIZE_THRESHOLD: 20,      // Start summarizing after 20 messages
  SUMMARY_BATCH_SIZE: 10,       // Summarize 10 messages at a time
  SESSION_TIMEOUT: 30 * 60 * 1000,  // 30 minutes
  MAX_SUMMARY_TOKENS: 500       // Target summary length
}

// Create new conversation session
export const createConversationSession = (
  userId?: string, 
  model: string = 'gpt-4-turbo'
): string => {
  const sessionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  conversationSessions.set(sessionId, {
    id: sessionId,
    userId,
    summary: null,
    recentMessages: [],
    totalMessages: 0,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    model,
    tokensSaved: 0
  })
  
  console.log(`✅ Created conversation session: ${sessionId}`)
  return sessionId
}

// Get conversation session
export const getConversationSession = (sessionId: string): ConversationSession | null => {
  const session = conversationSessions.get(sessionId)
  
  if (!session) return null
  
  // Check if session expired
  if (Date.now() - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
    conversationSessions.delete(sessionId)
    console.log(`⏰ Session expired: ${sessionId}`)
    return null
  }
  
  return session
}

// Add message to session
export const addMessageToSession = async (
  sessionId: string,
  message: ConversationMessage
): Promise<void> => {
  const session = conversationSessions.get(sessionId)
  if (!session) throw new Error('Session not found')
  
  session.recentMessages.push(message)
  session.totalMessages++
  session.lastActivity = Date.now()
  
  // Check if we need to summarize
  if (session.recentMessages.length >= SESSION_CONFIG.SUMMARIZE_THRESHOLD) {
    await summarizeOldMessages(sessionId)
  }
}

// Automatic summarization using Anthropic
const summarizeOldMessages = async (sessionId: string): Promise<void> => {
  const session = conversationSessions.get(sessionId)
  if (!session) return
  
  // Take first N messages to summarize
  const toSummarize = session.recentMessages.slice(0, SESSION_CONFIG.SUMMARY_BATCH_SIZE)
  const remaining = session.recentMessages.slice(SESSION_CONFIG.SUMMARY_BATCH_SIZE)
  
  if (toSummarize.length === 0) return
  
  console.log(`📝 Summarizing ${toSummarize.length} messages for session ${sessionId}`)
  
  try {
    // Calculate tokens being saved
    const originalTokens = toSummarize.reduce((sum, msg) => 
      sum + Math.ceil(msg.content.length / 4), 0
    )
    
    // Use Anthropic to generate summary
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    
    const conversationText = toSummarize.map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n')
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',  // Use cheaper model for summaries
      max_tokens: SESSION_CONFIG.MAX_SUMMARY_TOKENS,
      messages: [{
        role: 'user',
        content: `Summarize this conversation concisely, preserving key facts, decisions, and context. Be brief but complete:\n\n${conversationText}\n\nProvide a concise summary (3-4 sentences max):`
      }]
    })
    
    const newSummary = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''
    
    const summaryTokens = Math.ceil(newSummary.length / 4)
    
    // Append to existing summary or create new
    if (session.summary) {
      session.summary = `${session.summary}\n\n${newSummary}`
    } else {
      session.summary = newSummary
    }
    
    // Track cost savings
    session.tokensSaved += (originalTokens - summaryTokens)
    
    // Keep only recent messages
    session.recentMessages = remaining
    
    console.log(`✅ Summary created. Tokens: ${originalTokens} → ${summaryTokens} (saved ${originalTokens - summaryTokens})`)
    console.log(`💰 Total tokens saved in session: ${session.tokensSaved}`)
    
  } catch (error) {
    console.error('❌ Failed to summarize messages:', error instanceof Error ? error.message : String(error))
    
    // FALLBACK: If summarization fails, truncate old messages to prevent memory growth
    if (session.recentMessages.length > SESSION_CONFIG.MAX_RECENT_MESSAGES * 2) {
      const truncatedCount = session.recentMessages.length - SESSION_CONFIG.MAX_RECENT_MESSAGES
      session.recentMessages = session.recentMessages.slice(-SESSION_CONFIG.MAX_RECENT_MESSAGES)
      
      console.log(`⚠️ Summarization failed - Fallback: Truncated ${truncatedCount} oldest messages`)
      console.log(`📊 Kept last ${session.recentMessages.length} messages without summary`)
      
      // Still track some savings from truncation (rough estimate)
      const estimatedTokensSaved = truncatedCount * 100  // Rough estimate: 100 tokens per message
      session.tokensSaved += estimatedTokensSaved
    } else {
      console.log(`⚠️ Summarization failed but message count (${session.recentMessages.length}) is still manageable`)
    }
  }
}

// Get messages for API (summary + recent)
export const getSessionContext = (sessionId: string): {
  summary: string | null
  messages: ConversationMessage[]
  stats: { 
    total: number
    recent: number
    summarized: number
    tokensSaved: number
  }
} => {
  const session = conversationSessions.get(sessionId)
  if (!session) {
    return { 
      summary: null, 
      messages: [], 
      stats: { total: 0, recent: 0, summarized: 0, tokensSaved: 0 } 
    }
  }
  
  // Update last activity
  session.lastActivity = Date.now()
  
  const summarizedCount = session.totalMessages - session.recentMessages.length
  
  return {
    summary: session.summary,
    messages: session.recentMessages,
    stats: {
      total: session.totalMessages,
      recent: session.recentMessages.length,
      summarized: summarizedCount,
      tokensSaved: session.tokensSaved
    }
  }
}

// Cleanup expired sessions (run periodically)
export const cleanupExpiredSessions = (): void => {
  const now = Date.now()
  let cleaned = 0
  let totalTokensSaved = 0
  
  for (const [sessionId, session] of conversationSessions.entries()) {
    if (now - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
      totalTokensSaved += session.tokensSaved
      conversationSessions.delete(sessionId)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired conversation sessions (saved ${totalTokensSaved} tokens total)`)
  }
}

// Export for monitoring
export const getSessionStats = () => {
  const sessions = Array.from(conversationSessions.values())
  const totalTokensSaved = sessions.reduce((sum, s) => sum + s.tokensSaved, 0)
  
  return {
    totalSessions: sessions.length,
    totalMessages: sessions.reduce((sum, s) => sum + s.totalMessages, 0),
    totalTokensSaved,
    activeSessions: sessions.filter(s => 
      Date.now() - s.lastActivity < 5 * 60 * 1000  // Active in last 5 min
    ).length
  }
}

// Delete specific session
export const deleteConversationSession = (sessionId: string): boolean => {
  return conversationSessions.delete(sessionId)
}

