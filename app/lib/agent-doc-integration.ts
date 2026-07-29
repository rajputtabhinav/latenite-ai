/**
 * Agent-Documentation Integration Service
 * Simple hook to integrate Context7 documentation with agent tasks
 * 
 * Usage in AIAgent.tsx:
 * import { enhanceAgentPromptWithDocs } from '@/lib/agent-doc-integration'
 * 
 * const enhanced = await enhanceAgentPromptWithDocs(userMessage, isMCPEnabled)
 * // Pass enhanced prompt to AI
 */

import { agentDocumentationHelper } from './agent-documentation-helper'
import { agentContextEnhancer } from './agent-context-enhancer'
import { logger } from './utils/logger'

/**
 * Main function: Enhance agent prompt with automatic documentation
 */
export async function enhanceAgentPromptWithDocs(
  userMessage: string,
  mcpEnabled: boolean = true,
  existingPrompt?: string
): Promise<string> {
  if (!mcpEnabled) {
    return existingPrompt || ''
  }
  
  try {
    // Detect if this is a task that needs documentation
    const needsDocs = detectIfNeedsDocs(userMessage)
    
    if (!needsDocs) {
      logger.debug('Task does not require documentation')
      return existingPrompt || ''
    }
    
    logger.info(`📚 Auto-fetching documentation for: ${userMessage.substring(0, 50)}...`)
    
    // Fetch documentation
    const docs = await agentDocumentationHelper.fetchDocumentationForTask(userMessage)
    
    if (!docs) {
      logger.debug('No documentation found')
      return existingPrompt || ''
    }
    
    // Build enhanced prompt
    const enhancement = `

<auto_fetched_documentation>
**📚 Automatically Retrieved Documentation**

The following documentation has been fetched from Context7 to help you complete this task.
Use this as a reference for correct syntax, best practices, and implementation details.

${docs}

**Instructions:**
- Use this documentation as your primary reference
- Follow the latest syntax and best practices shown above
- If you encounter errors, refer back to these docs
- The documentation is from the LATEST version
</auto_fetched_documentation>
`
    
    logger.info(`✅ Enhanced prompt with ${docs.length} chars of documentation`)
    
    return existingPrompt ? existingPrompt + enhancement : enhancement
    
  } catch (error) {
    logger.error('Failed to enhance prompt with docs:', error)
    return existingPrompt || ''
  }
}

/**
 * Detect if task needs documentation
 */
function detectIfNeedsDocs(message: string): boolean {
  const text = message.toLowerCase()
  
  // Technical task indicators
  const technicalPatterns = [
    /benchmark/i,
    /mlperf/i,
    /migration/i,
    /install|setup|configure/i,
    /pytorch|tensorflow|transformers/i,
    /docker|kubernetes/i,
    /database|postgres|mysql|mongodb/i,
    /compile|build/i,
    /deploy/i,
    /optimize|performance/i,
    /machine learning|ml|ai model/i,
    /nvidia|cuda|gpu/i,
    /certification|compliance/i
  ]
  
  return technicalPatterns.some(pattern => pattern.test(text))
}

/**
 * Enhance ReAct prompt specifically for long-running tasks
 */
export async function enhanceReActPromptWithDocs(
  taskDescription: string,
  basePrompt: string,
  mcpEnabled: boolean = true
): Promise<string> {
  if (!mcpEnabled) {
    return basePrompt
  }
  
  try {
    // Get enhanced context
    const enhancedContext = await agentContextEnhancer.enhanceContextForTask(
      taskDescription,
      mcpEnabled
    )
    
    if (!enhancedContext.documentation && !enhancedContext.systemInfo) {
      return basePrompt
    }
    
    // Format and append to base prompt
    const formattedContext = agentContextEnhancer.formatEnhancedContext(enhancedContext)
    
    logger.info(`✅ Enhanced ReAct prompt with ${enhancedContext.sources.join(', ')}`)
    
    return basePrompt + formattedContext
    
  } catch (error) {
    logger.error('Failed to enhance ReAct prompt:', error)
    return basePrompt
  }
}

/**
 * Get documentation for specific command (called before execution)
 */
export async function getDocsForCommand(
  command: string,
  mcpEnabled: boolean = true
): Promise<string> {
  if (!mcpEnabled) {
    return ''
  }
  
  try {
    const docs = await agentDocumentationHelper.getCommandHelp(command)
    
    if (docs) {
      logger.info(`📖 Fetched command docs for: ${command}`)
      return `\n\n<command_reference>\n${docs}\n</command_reference>\n\n`
    }
    
    return ''
  } catch (error) {
    logger.error('Failed to get command docs:', error)
    return ''
  }
}

/**
 * Enhance error message with troubleshooting docs
 */
export async function enhanceErrorWithDocs(
  errorMessage: string,
  command: string,
  mcpEnabled: boolean = true
): Promise<string> {
  if (!mcpEnabled) {
    return errorMessage
  }
  
  try {
    const enhancement = await agentContextEnhancer.enhanceDuringExecution(command, errorMessage)
    
    if (enhancement) {
      logger.info('📖 Added troubleshooting docs to error')
      return errorMessage + enhancement
    }
    
    return errorMessage
  } catch (error) {
    logger.error('Failed to enhance error:', error)
    return errorMessage
  }
}

/**
 * Pre-fetch documentation for MLPerf benchmarking
 */
export async function prefetchMLPerfDocs(): Promise<string> {
  logger.info('📚 Pre-fetching MLPerf documentation bundle...')
  
  const libraries = ['mlperf', 'pytorch', 'transformers', 'cuda', 'screen']
  let allDocs = '# MLPerf Benchmarking Documentation Bundle\n\n'
  
  for (const lib of libraries) {
    try {
      const docs = await agentDocumentationHelper.fetchLibraryDocs(lib)
      if (docs) {
        allDocs += `\n## ${lib}\n${docs.content}\n`
      }
    } catch (error) {
      logger.warn(`Failed to fetch ${lib} docs:`, error)
    }
  }
  
  logger.info('✅ MLPerf documentation bundle ready')
  return allDocs
}

export default {
  enhanceAgentPromptWithDocs,
  enhanceReActPromptWithDocs,
  getDocsForCommand,
  enhanceErrorWithDocs,
  prefetchMLPerfDocs
}

