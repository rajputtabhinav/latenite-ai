// ReAct Agent Service - Extracted from AIAgent.tsx
// Handles Reason → Act → Observe loop logic

import { logger } from '../lib/utils/logger'
import { buildReActPrompt } from '../lib/prompts/unified-agent-prompt'

export interface ReActHistory {
  thought: string
  action: string
  observation: string
}

export interface ReActResult {
  thought: string
  action: string | null
  isDone: boolean
}

export interface ReActConfig {
  maxIterations: number
  iterationDelay: number
  preCommandDelay: number
}

export class ReactAgentService {
  private config: ReActConfig = {
    maxIterations: 10,
    iterationDelay: 5000,  // 5 seconds between iterations
    preCommandDelay: 3000   // 3 seconds before sending command
  }

  constructor(config?: Partial<ReActConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Generate next action using AI reasoning
   * Takes terminal context and history to decide what to do next
   */
  async getNextAction(
    taskDescription: string,
    terminalHistory: string[],
    history: ReActHistory[],
    iterationCount: number,
    aiClient: (prompt: string) => Promise<string>
  ): Promise<ReActResult> {
    logger.agent.reasoning(`Iteration ${iterationCount}`)
    
    // Build context from history
    const contextHistory = history.map((h, i) => 
      `Iteration ${i + 1}:\nThought: ${h.thought}\nAction: ${h.action}\nObservation: ${h.observation}`
    ).join('\n\n')
    
    // Get terminal context (last 200 lines)
    const recentTerminal = terminalHistory.slice(-200).join('')
    
    // Create OS-agnostic prompt using professional prompt system
    const prompt = buildReActPrompt(taskDescription, recentTerminal, contextHistory)
    
    try {
      // Call AI via provided client function
      const aiResponse = await aiClient(prompt)
      
      logger.debug('AI Response:', aiResponse)
      
      // Parse response
      return this.parseAIResponse(aiResponse)
      
    } catch (error) {
      logger.error('AI reasoning failed:', error)
      // If AI fails, stop the task
      return {
        thought: 'AI reasoning failed - stopping task',
        action: null,
        isDone: true
      }
    }
  }

  // buildReActPrompt() removed - now using centralized prompt system from /lib/prompts/

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(aiResponse: string): ReActResult {
    const thoughtMatch = aiResponse.match(/THOUGHT:\s*([\s\S]+?)(?=\nACTION:|$)/)
    const actionMatch = aiResponse.match(/ACTION:\s*([\s\S]+?)$/)
    
    const thought = thoughtMatch ? thoughtMatch[1].trim() : 'Analyzing situation'
    const action = actionMatch ? actionMatch[1].trim() : null
    
    const isDone = !action || 
                   action === 'TASK_COMPLETE' || 
                   action.toUpperCase().includes('TASK_COMPLETE') ||
                   action.toUpperCase().includes('COMPLETE')
    
    return {
      thought,
      action: isDone ? null : action,
      isDone
    }
  }

  /**
   * Check if task is complete based on multiple signals
   */
  isTaskComplete(thought: string, action: string | null, isDone: boolean): boolean {
    return isDone || 
           !action || 
           action.toUpperCase().includes('TASK_COMPLETE') ||
           action.toUpperCase().includes('COMPLETE') ||
           action.trim() === '' ||
           thought.toLowerCase().includes('task is complete') ||
           thought.toLowerCase().includes('task complete') ||
           thought.toLowerCase().includes('successfully retrieved') ||
           thought.toLowerCase().includes('have the answer')
  }

  /**
   * Detect if commands got concatenated in terminal
   */
  detectConcatenation(action: string, terminalOutput: string): boolean {
    if (!action || action.length < 3) return false
    
    // Check if command appears twice
    const doubled = terminalOutput.includes(action + action)
    
    // Check if command substring appears multiple times nearby
    const regex = new RegExp(`${action.substring(0, Math.min(10, action.length))}.*${action.substring(0, Math.min(10, action.length))}`, 'i')
    const duplicated = regex.test(terminalOutput)
    
    return doubled || duplicated
  }

  /**
   * Get configuration
   */
  getConfig(): ReActConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ReActConfig>) {
    this.config = { ...this.config, ...newConfig }
  }
}

// Singleton instance
let reactAgentInstance: ReactAgentService | null = null

export function getReActAgent(config?: Partial<ReActConfig>): ReactAgentService {
  if (!reactAgentInstance) {
    reactAgentInstance = new ReactAgentService(config)
  }
  return reactAgentInstance
}

export default ReactAgentService

