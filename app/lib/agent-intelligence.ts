// Agent Intelligence Layer - Combines embeddings, memory, and context
'use client'

import { findRelevantCodeForQuery, buildCodeContext, type SearchResult } from './embeddings/semantic-search'
import { saveConversation, loadConversation, saveDecision, getSimilarDecisions } from './memory/persistent-memory'

export interface AgentContext {
  codeContext?: string
  terminalContext?: string[]
  previousDecisions?: any[]
  memoryRestored?: boolean
}

/**
 * Enhance user query with relevant code context
 * This is called BEFORE sending to AI to provide relevant codebase knowledge
 */
export async function enhanceQueryWithCodeContext(
  userQuery: string,
  terminalHistory: string[]
): Promise<{ enhancedQuery: string; context: AgentContext }> {
  try {
    console.log('🧠 Enhancing query with intelligence layer...')
    
    const context: AgentContext = {
      terminalContext: terminalHistory.slice(-5000)
    }
    
    // Try semantic search (will fail gracefully if not indexed)
    try {
      const relevantCode = await findRelevantCodeForQuery(userQuery, 10)
      
      if (relevantCode.length > 0) {
        context.codeContext = buildCodeContext(relevantCode)
        console.log(`✅ Found ${relevantCode.length} relevant code snippets`)
      } else {
        console.log('ℹ️ No relevant code found (may need to index codebase)')
      }
    } catch (searchError) {
      console.log('⚠️ Semantic search not available (codebase not indexed or Qdrant not running)')
    }
    
    // Get similar past decisions
    const similarDecisions = await getSimilarDecisions(userQuery, 3)
    if (similarDecisions.length > 0) {
      context.previousDecisions = similarDecisions
      console.log(`🧠 Found ${similarDecisions.length} similar past decisions`)
    }
    
    // Build enhanced query
    let enhancedQuery = userQuery
    
    if (context.codeContext) {
      enhancedQuery += `\n\n${context.codeContext}`
    }
    
    if (context.previousDecisions && context.previousDecisions.length > 0) {
      const decisionsText = context.previousDecisions.map(d => 
        `- Task: "${d.task}" → Decision: ${d.decision} (${d.success ? 'Success' : 'Failed'})`
      ).join('\n')
      
      enhancedQuery += `\n\n## Past Similar Decisions:\n${decisionsText}`
    }
    
    return { enhancedQuery, context }
    
  } catch (error) {
    console.error('❌ Failed to enhance query:', error)
    // Fallback to original query
    return {
      enhancedQuery: userQuery,
      context: { terminalContext: terminalHistory.slice(-5000) }
    }
  }
}

/**
 * Save conversation to persistent storage
 */
export async function persistConversation(
  sessionId: string,
  messages: any[],
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await saveConversation(sessionId, messages, metadata)
    console.log('💾 Conversation persisted')
  } catch (error) {
    console.error('❌ Failed to persist conversation:', error)
  }
}

/**
 * Restore conversation from storage
 */
export async function restoreConversation(sessionId: string): Promise<any[] | null> {
  try {
    const messages = await loadConversation(sessionId)
    if (messages) {
      console.log(`📂 Restored conversation: ${messages.length} messages`)
    }
    return messages
  } catch (error) {
    console.error('❌ Failed to restore conversation:', error)
    return null
  }
}

/**
 * Record agent decision for learning
 */
export async function recordDecision(
  task: string,
  decision: string,
  reasoning: string,
  success: boolean,
  context: any = {}
): Promise<void> {
  try {
    await saveDecision(task, decision, reasoning, success, context)
    console.log('🧠 Decision recorded for future learning')
  } catch (error) {
    console.error('❌ Failed to record decision:', error)
  }
}

export default {
  enhanceQueryWithCodeContext,
  persistConversation,
  restoreConversation,
  recordDecision
}

