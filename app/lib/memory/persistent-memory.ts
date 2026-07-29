// Persistent Memory System - IndexedDB for conversations and context
'use client'

import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: string
}

interface Conversation {
  id: string
  sessionId: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  projectPath?: string
  metadata?: Record<string, any>
}

interface ProjectContext {
  id: string
  projectPath: string
  files: string[]
  lastIndexed: Date
  embeddings: boolean
  stats: {
    fileCount: number
    totalLines: number
    languages: Record<string, number>
  }
}

interface AgentDecision {
  id: string
  timestamp: Date
  task: string
  decision: string
  reasoning: string
  success: boolean
  context: any
}

interface AgentMemoryDB extends DBSchema {
  conversations: {
    key: string
    value: Conversation
    indexes: { 'by-session': string; 'by-date': Date }
  }
  projectContext: {
    key: string
    value: ProjectContext
    indexes: { 'by-path': string }
  }
  decisions: {
    key: string
    value: AgentDecision
    indexes: { 'by-date': Date; 'by-task': string }
  }
}

// Singleton database instance
let db: IDBPDatabase<AgentMemoryDB> | null = null

/**
 * Initialize IndexedDB
 */
async function getDB(): Promise<IDBPDatabase<AgentMemoryDB>> {
  if (db) return db
  
  db = await openDB<AgentMemoryDB>('latenite-agent-memory', 1, {
    upgrade(database) {
      // Conversations store
      if (!database.objectStoreNames.contains('conversations')) {
        const conversationStore = database.createObjectStore('conversations', { keyPath: 'id' })
        conversationStore.createIndex('by-session', 'sessionId')
        conversationStore.createIndex('by-date', 'updatedAt')
      }
      
      // Project context store
      if (!database.objectStoreNames.contains('projectContext')) {
        const projectStore = database.createObjectStore('projectContext', { keyPath: 'id' })
        projectStore.createIndex('by-path', 'projectPath')
      }
      
      // Decisions store
      if (!database.objectStoreNames.contains('decisions')) {
        const decisionStore = database.createObjectStore('decisions', { keyPath: 'id' })
        decisionStore.createIndex('by-date', 'timestamp')
        decisionStore.createIndex('by-task', 'task')
      }
    }
  })
  
  console.log('✅ Persistent memory database initialized')
  return db
}

/**
 * Save conversation
 */
export async function saveConversation(
  sessionId: string,
  messages: Message[],
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const database = await getDB()
    
    const conversation: Conversation = {
      id: `conv_${sessionId}_${Date.now()}`,
      sessionId,
      messages,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata
    }
    
    await database.put('conversations', conversation)
    console.log(`💾 Saved conversation: ${messages.length} messages`)
  } catch (error) {
    console.error('❌ Failed to save conversation:', error)
  }
}

/**
 * Load conversation by session ID
 */
export async function loadConversation(sessionId: string): Promise<Message[] | null> {
  try {
    const database = await getDB()
    const conversations = await database.getAllFromIndex('conversations', 'by-session', sessionId)
    
    if (conversations.length === 0) return null
    
    // Get most recent conversation
    const latest = conversations.sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0]
    
    console.log(`📂 Loaded conversation: ${latest.messages.length} messages`)
    return latest.messages
  } catch (error) {
    console.error('❌ Failed to load conversation:', error)
    return null
  }
}

/**
 * Get all conversations
 */
export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const database = await getDB()
    const conversations = await database.getAll('conversations')
    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  } catch (error) {
    console.error('❌ Failed to get conversations:', error)
    return []
  }
}

/**
 * Delete conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const database = await getDB()
    await database.delete('conversations', conversationId)
    console.log(`🗑️ Deleted conversation: ${conversationId}`)
  } catch (error) {
    console.error('❌ Failed to delete conversation:', error)
  }
}

/**
 * Save project context
 */
export async function saveProjectContext(context: Omit<ProjectContext, 'id'>): Promise<void> {
  try {
    const database = await getDB()
    
    const projectContext: ProjectContext = {
      id: `project_${context.projectPath}_${Date.now()}`,
      ...context
    }
    
    await database.put('projectContext', projectContext)
    console.log(`💾 Saved project context: ${context.files.length} files`)
  } catch (error) {
    console.error('❌ Failed to save project context:', error)
  }
}

/**
 * Load project context
 */
export async function loadProjectContext(projectPath: string): Promise<ProjectContext | null> {
  try {
    const database = await getDB()
    const contexts = await database.getAllFromIndex('projectContext', 'by-path', projectPath)
    
    if (contexts.length === 0) return null
    
    // Get most recent
    const latest = contexts.sort((a, b) => 
      b.lastIndexed.getTime() - a.lastIndexed.getTime()
    )[0]
    
    console.log(`📂 Loaded project context: ${latest.files.length} files`)
    return latest
  } catch (error) {
    console.error('❌ Failed to load project context:', error)
    return null
  }
}

/**
 * Save agent decision for learning
 */
export async function saveDecision(
  task: string,
  decision: string,
  reasoning: string,
  success: boolean,
  context: any = {}
): Promise<void> {
  try {
    const database = await getDB()
    
    const agentDecision: AgentDecision = {
      id: `decision_${Date.now()}`,
      timestamp: new Date(),
      task,
      decision,
      reasoning,
      success,
      context
    }
    
    await database.put('decisions', agentDecision)
    console.log(`🧠 Saved decision: ${task}`)
  } catch (error) {
    console.error('❌ Failed to save decision:', error)
  }
}

/**
 * Get similar past decisions
 */
export async function getSimilarDecisions(task: string, limit: number = 5): Promise<AgentDecision[]> {
  try {
    const database = await getDB()
    const allDecisions = await database.getAllFromIndex('decisions', 'by-date')
    
    // Simple text matching (can be enhanced with embeddings later)
    const taskLower = task.toLowerCase()
    const relevant = allDecisions.filter(d => 
      d.task.toLowerCase().includes(taskLower) ||
      taskLower.includes(d.task.toLowerCase())
    )
    
    return relevant.slice(0, limit)
  } catch (error) {
    console.error('❌ Failed to get similar decisions:', error)
    return []
  }
}

/**
 * Clear old data (cleanup)
 */
export async function cleanupOldData(daysOld: number = 30): Promise<void> {
  try {
    const database = await getDB()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    
    // Clean conversations
    const oldConversations = await database.getAllFromIndex('conversations', 'by-date')
    let deleted = 0
    
    for (const conv of oldConversations) {
      if (conv.updatedAt < cutoffDate) {
        await database.delete('conversations', conv.id)
        deleted++
      }
    }
    
    console.log(`🗑️ Cleaned up ${deleted} old conversations`)
  } catch (error) {
    console.error('❌ Failed to cleanup:', error)
  }
}

/**
 * Export all data (for backup)
 */
export async function exportAllData(): Promise<{
  conversations: Conversation[]
  projectContext: ProjectContext[]
  decisions: AgentDecision[]
}> {
  try {
    const database = await getDB()
    
    return {
      conversations: await database.getAll('conversations'),
      projectContext: await database.getAll('projectContext'),
      decisions: await database.getAll('decisions')
    }
  } catch (error) {
    console.error('❌ Failed to export data:', error)
    return { conversations: [], projectContext: [], decisions: [] }
  }
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(): Promise<{
  conversationCount: number
  projectCount: number
  decisionCount: number
  oldestConversation?: Date
  newestConversation?: Date
}> {
  try {
    const database = await getDB()
    
    const conversations = await database.getAll('conversations')
    const projects = await database.getAll('projectContext')
    const decisions = await database.getAll('decisions')
    
    const dates = conversations.map(c => c.updatedAt).sort((a, b) => a.getTime() - b.getTime())
    
    return {
      conversationCount: conversations.length,
      projectCount: projects.length,
      decisionCount: decisions.length,
      oldestConversation: dates[0],
      newestConversation: dates[dates.length - 1]
    }
  } catch (error) {
    console.error('❌ Failed to get stats:', error)
    return { conversationCount: 0, projectCount: 0, decisionCount: 0 }
  }
}

export default {
  saveConversation,
  loadConversation,
  getAllConversations,
  deleteConversation,
  saveProjectContext,
  loadProjectContext,
  saveDecision,
  getSimilarDecisions,
  cleanupOldData,
  exportAllData,
  getMemoryStats
}

