/**
 * Auto Documentation Fetcher
 * Automatically fetches documentation when agent needs it for tasks
 * Integrates Context7 MCP with agent workflow
 */

import { logger } from './utils/logger'
import { agentDocumentationHelper } from './agent-documentation-helper'

export interface AutoDocConfig {
  enableAutoFetch: boolean
  cacheEnabled: boolean
  maxDocsPerTask: number
  fetchTimeout: number
}

export class AutoDocumentationFetcher {
  private static instance: AutoDocumentationFetcher
  private config: AutoDocConfig = {
    enableAutoFetch: true,
    cacheEnabled: true,
    maxDocsPerTask: 5,
    fetchTimeout: 10000
  }
  
  private fetchedDocsForCurrentTask: Set<string> = new Set()
  
  private constructor() {}
  
  static getInstance(): AutoDocumentationFetcher {
    if (!this.instance) {
      this.instance = new AutoDocumentationFetcher()
    }
    return this.instance
  }
  
  /**
   * Analyze agent message and auto-fetch needed documentation
   */
  async analyzeAndFetchDocs(
    agentMessage: string,
    taskContext?: string
  ): Promise<string> {
    if (!this.config.enableAutoFetch) {
      return ''
    }
    
    // Reset for new task
    if (taskContext && taskContext.includes('new task')) {
      this.fetchedDocsForCurrentTask.clear()
    }
    
    // Detect if agent is showing uncertainty or needs help
    const needsHelp = this.detectUncertainty(agentMessage)
    
    if (!needsHelp) {
      return ''
    }
    
    // Extract what the agent needs help with
    const helpTopics = this.extractHelpTopics(agentMessage)
    
    if (helpTopics.length === 0) {
      return ''
    }
    
    // Fetch documentation for detected topics
    let documentation = ''
    
    for (const topic of helpTopics) {
      // Skip if already fetched for this task
      if (this.fetchedDocsForCurrentTask.has(topic)) {
        continue
      }
      
      // Limit docs per task
      if (this.fetchedDocsForCurrentTask.size >= this.config.maxDocsPerTask) {
        logger.warn(`📚 Max docs limit reached for task (${this.config.maxDocsPerTask})`)
        break
      }
      
      try {
        logger.info(`📖 Auto-fetching docs for: ${topic}`)
        const docs = await agentDocumentationHelper.fetchLibraryDocs(topic, taskContext)
        
        if (docs) {
          documentation += `\n\n### ${topic}\n${docs.content}\n`
          this.fetchedDocsForCurrentTask.add(topic)
          logger.info(`✅ Auto-fetched docs for ${topic}`)
        }
      } catch (error) {
        logger.error(`Failed to auto-fetch docs for ${topic}:`, error)
      }
    }
    
    return documentation
  }
  
  /**
   * Pre-fetch documentation before starting a task
   */
  async prefetchDocsForTask(taskDescription: string): Promise<string> {
    logger.info(`📚 Pre-fetching documentation for task...`)
    
    this.fetchedDocsForCurrentTask.clear()
    
    const documentation = await agentDocumentationHelper.fetchDocumentationForTask(taskDescription)
    
    if (documentation) {
      logger.info(`✅ Pre-fetched documentation (${documentation.length} chars)`)
      
      // Mark as fetched
      const libraries = agentDocumentationHelper['detectLibraries'](taskDescription)
      libraries.forEach(lib => this.fetchedDocsForCurrentTask.add(lib))
    }
    
    return documentation
  }
  
  /**
   * Detect if agent message shows uncertainty
   */
  private detectUncertainty(message: string): boolean {
    const uncertaintyPatterns = [
      /i'm not sure/i,
      /i don't know/i,
      /unclear/i,
      /not familiar with/i,
      /need to check/i,
      /let me look up/i,
      /need documentation/i,
      /how do i/i,
      /what is the syntax/i,
      /correct command/i,
      /proper way/i,
      /best practice/i
    ]
    
    return uncertaintyPatterns.some(pattern => pattern.test(message))
  }
  
  /**
   * Extract what topics the agent needs help with
   */
  private extractHelpTopics(message: string): string[] {
    const topics: string[] = []
    
    // Look for library/tool mentions
    const mentionPatterns = [
      /(?:using|with|for|about)\s+([a-zA-Z][a-zA-Z0-9\-\.]+)/gi,
      /([a-zA-Z][a-zA-Z0-9\-\.]+)\s+(?:command|library|tool|framework)/gi,
      /how to (?:use|install|configure|setup)\s+([a-zA-Z][a-zA-Z0-9\-\.]+)/gi
    ]
    
    for (const pattern of mentionPatterns) {
      let match
      while ((match = pattern.exec(message)) !== null) {
        if (match[1] && match[1].length > 2) {
          topics.push(match[1].toLowerCase())
        }
      }
    }
    
    return [...new Set(topics)] // Remove duplicates
  }
  
  /**
   * Get documentation for specific command before execution
   */
  async getPreExecutionDocs(command: string): Promise<string> {
    logger.debug(`📖 Getting pre-execution docs for: ${command}`)
    
    const docs = await agentDocumentationHelper.getCommandHelp(command)
    
    if (docs) {
      logger.info(`✅ Found pre-execution docs for ${command}`)
      return `\n\n<command_documentation>\n${docs}\n</command_documentation>\n`
    }
    
    return ''
  }
  
  /**
   * Reset for new task
   */
  resetForNewTask(): void {
    this.fetchedDocsForCurrentTask.clear()
    logger.debug('📚 Documentation tracker reset for new task')
  }
  
  /**
   * Configuration
   */
  setConfig(config: Partial<AutoDocConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('⚙️ Auto-doc config updated:', config)
  }
  
  getConfig(): AutoDocConfig {
    return { ...this.config }
  }
}

export const autoDocumentationFetcher = AutoDocumentationFetcher.getInstance()

