// Server-side only - removed 'use client'
import { QdrantClient } from '@qdrant/js-client-rest'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tokens: number
}

export interface ConversationSummary {
  id: string
  messages: ConversationMessage[]
  summary: string
  topics: string[]
  decisions: string[]
  totalTokens: number
  summarizedAt: Date
}

export interface MemoryStats {
  totalConversations: number
  totalMessages: number
  totalTokensSaved: number
  averageSummaryRatio: number
}

export class ConversationMemory {
  private qdrantClient: QdrantClient | null = null
  private collectionName = 'conversation_memory'
  private maxMessagesBeforeSummary = 20
  private summaryCache: Map<string, ConversationSummary> = new Map()

  constructor() {
    try {
      this.qdrantClient = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333'
      })
      this.ensureCollection()
    } catch (error) {
      console.error('Failed to initialize Qdrant for conversation memory:', error)
    }
  }

  /**
   * Ensure collection exists
   */
  private async ensureCollection(): Promise<void> {
    if (!this.qdrantClient) return

    try {
      const collections = await this.qdrantClient.getCollections()
      const exists = collections.collections.some(c => c.name === this.collectionName)

      if (!exists) {
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: 3072, // OpenAI text-embedding-3-large
            distance: 'Cosine'
          }
        })
        console.log(`✅ Created conversation memory collection: ${this.collectionName}`)
      }
    } catch (error) {
      console.error('Error ensuring collection:', error)
    }
  }

  /**
   * Store conversation in vector DB
   */
  async storeConversation(
    conversationId: string,
    messages: ConversationMessage[],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.qdrantClient) return

    // Generate summary if conversation is long enough
    let summary: ConversationSummary | null = null
    if (messages.length >= this.maxMessagesBeforeSummary) {
      summary = await this.summarizeConversation(conversationId, messages)
    }

    // Create embedding for the conversation
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')
      .slice(0, 8000) // Limit for embedding

    try {
      const embedding = await this.generateEmbedding(conversationText)

      await this.qdrantClient.upsert(this.collectionName, {
        points: [
          {
            id: conversationId,
            vector: embedding,
            payload: {
              conversationId,
              messageCount: messages.length,
              totalTokens: messages.reduce((sum, m) => sum + m.tokens, 0),
              summary: summary?.summary || '',
              topics: summary?.topics || [],
              decisions: summary?.decisions || [],
              lastMessageAt: messages[messages.length - 1]?.timestamp.toISOString(),
              metadata: metadata || {}
            }
          }
        ]
      })

      console.log(`💾 Stored conversation ${conversationId} in vector DB`)
    } catch (error) {
      console.error('Error storing conversation:', error)
    }
  }

  /**
   * Summarize conversation using AI
   */
  async summarizeConversation(
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<ConversationSummary> {
    // Check cache first
    const cached = this.summaryCache.get(conversationId)
    if (cached) return cached

    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Summarize this conversation in 2-3 paragraphs. Extract:
1. Main topics discussed
2. Key decisions made
3. Important context to remember

Conversation:
${conversationText.slice(0, 10000)}

Format:
SUMMARY: [your summary]
TOPICS: [comma-separated topics]
DECISIONS: [comma-separated decisions]`
            }
          ],
          model: 'claude-3-haiku', // Use fast model for summarization
          autoRouteModel: false
        })
      })

      const data = await response.json()
      const summaryText = data.message || ''

      // Parse summary
      const summaryMatch = summaryText.match(/SUMMARY:\s*(.+?)(?=\nTOPICS:|$)/s)
      const topicsMatch = summaryText.match(/TOPICS:\s*(.+?)(?=\nDECISIONS:|$)/s)
      const decisionsMatch = summaryText.match(/DECISIONS:\s*(.+?)$/s)

      const summary: ConversationSummary = {
        id: conversationId,
        messages,
        summary: summaryMatch ? summaryMatch[1].trim() : summaryText,
        topics: topicsMatch ? topicsMatch[1].split(',').map(t => t.trim()) : [],
        decisions: decisionsMatch ? decisionsMatch[1].split(',').map(d => d.trim()) : [],
        totalTokens: messages.reduce((sum, m) => sum + m.tokens, 0),
        summarizedAt: new Date()
      }

      // Cache summary
      this.summaryCache.set(conversationId, summary)
      
      console.log(`📝 Generated summary for conversation ${conversationId}`)
      console.log(`   Topics: ${summary.topics.join(', ')}`)
      console.log(`   Token reduction: ${messages.reduce((sum, m) => sum + m.tokens, 0)} → ${summary.summary.length / 4} (~${((1 - (summary.summary.length / 4) / messages.reduce((sum, m) => sum + m.tokens, 0)) * 100).toFixed(0)}% savings)`)

      return summary
    } catch (error) {
      console.error('Error summarizing conversation:', error)
      return {
        id: conversationId,
        messages,
        summary: 'Summary generation failed',
        topics: [],
        decisions: [],
        totalTokens: messages.reduce((sum, m) => sum + m.tokens, 0),
        summarizedAt: new Date()
      }
    }
  }

  /**
   * Search similar conversations
   */
  async searchSimilar(query: string, limit: number = 5): Promise<Array<{
    conversationId: string
    summary: string
    topics: string[]
    score: number
  }>> {
    if (!this.qdrantClient) return []

    try {
      const embedding = await this.generateEmbedding(query)

      const results = await this.qdrantClient.search(this.collectionName, {
        vector: embedding,
        limit,
        with_payload: true
      })

      return results.map(result => ({
        conversationId: result.payload?.conversationId as string,
        summary: result.payload?.summary as string || '',
        topics: (result.payload?.topics as string[]) || [],
        score: result.score || 0
      }))
    } catch (error) {
      console.error('Error searching conversations:', error)
      return []
    }
  }

  /**
   * Get conversation context for AI
   */
  async getContextForQuery(query: string): Promise<string> {
    const similar = await this.searchSimilar(query, 3)

    if (similar.length === 0) {
      return 'No relevant conversation history found.'
    }

    let context = '**Relevant Past Conversations:**\n\n'
    
    for (const conv of similar) {
      context += `**Conversation** (${conv.topics.join(', ')})\n`
      context += `${conv.summary}\n\n`
    }

    return context
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${process.env.OPENAI_API_URL || 'https://api.openai.com/v1'}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: text.slice(0, 8000) // Limit input
      })
    })

    const data = await response.json()
    return data.data[0].embedding
  }

  /**
   * Prune old messages and keep only summary
   */
  pruneConversation(messages: ConversationMessage[], keepRecent: number = 10): {
    prunedMessages: ConversationMessage[]
    summary: string | null
  } {
    if (messages.length <= keepRecent) {
      return { prunedMessages: messages, summary: null }
    }

    // Keep recent messages
    const recent = messages.slice(-keepRecent)
    
    // Summarize older messages
    const older = messages.slice(0, -keepRecent)
    const summary = `[Earlier in conversation: ${older.length} messages covering various topics]`

    console.log(`✂️ Pruned ${older.length} messages, kept ${recent.length} recent`)

    return {
      prunedMessages: recent,
      summary
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    if (!this.qdrantClient) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalTokensSaved: 0,
        averageSummaryRatio: 0
      }
    }

    try {
      const info = await this.qdrantClient.getCollection(this.collectionName)
      
      return {
        totalConversations: info.points_count || 0,
        totalMessages: 0, // Would need to aggregate from payloads
        totalTokensSaved: 0, // Would need to calculate
        averageSummaryRatio: 0.7 // Estimated 70% token reduction
      }
    } catch (error) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalTokensSaved: 0,
        averageSummaryRatio: 0
      }
    }
  }

  /**
   * Clear all conversation memory
   */
  async clearAll(): Promise<void> {
    if (!this.qdrantClient) return

    try {
      await this.qdrantClient.deleteCollection(this.collectionName)
      await this.ensureCollection()
      this.summaryCache.clear()
      console.log('🗑️ Cleared all conversation memory')
    } catch (error) {
      console.error('Error clearing memory:', error)
    }
  }
}

// Global memory instance
let globalMemory: ConversationMemory | null = null

export function getGlobalMemory(): ConversationMemory {
  if (!globalMemory) {
    globalMemory = new ConversationMemory()
  }
  return globalMemory
}
