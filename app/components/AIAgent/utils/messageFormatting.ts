/**
 * Message Formatting Utilities
 * Functions for formatting and processing AI agent messages
 */

/**
 * Make AI responses simple and friendly
 * Removes ALL technical jargon and verbose explanations
 */
export function makeUserFriendly(thought: string): string {
  // Remove technical patterns
  let friendly = thought
    .replace(/THOUGHT:\s*/gi, '')
    .replace(/ACTION:\s*/gi, '')
    .replace(/OBSERVATION:\s*/gi, '')
    .replace(/\[SYSTEM\]/gi, '')
    .replace(/\[DEBUG\]/gi, '')
    .trim()
  
  // Remove ALL technical verbose patterns
  friendly = friendly
    // Terminal mentions
    .replace(/Terminal shows Linux system with/gi, 'Found')
    .replace(/Terminal shows Linux system/gi, 'Linux system')
    .replace(/Terminal shows/gi, '')
    .replace(/Terminal is clean\./gi, '')
    .replace(/I'm terminal shows/gi, '')
    
    // Detected/Analysis phrases
    .replace(/Detected Linux with/gi, 'Found')
    .replace(/Detected Linux\./gi, '')
    .replace(/I'm analyzing terminal context, I see/gi, '')
    .replace(/The terminal output indicates that/gi, '')
    .replace(/which clearly indicates/gi, '')
    .replace(/as evidenced by/gi, '')
    
    // Verbose explanations
    .replace(/already visible from lsblk output/gi, '')
    .replace(/Cleaning up messy terminal first, then will/gi, 'Will')
    .replace(/Getting detailed NVMe information using/gi, 'Getting NVMe info with')
    .replace(/Let me get detailed health information for/gi, 'Checking')
    .replace(/Need to check SMART status for/gi, 'Checking')
    .replace(/have been retrieved but appear truncated/gi, 'checked')
    .replace(/was started but output is truncated/gi, 'running')
    
    // Common verbose patterns
    .replace(/Additionally,/gi, '')
    .replace(/Upon examination/gi, '')
    .replace(/It is clear that/gi, '')
    .replace(/Reviewing the previous observation,/gi, '')
    .replace(/The previous command returned/gi, 'Got')
    .replace(/I can see/gi, 'Found')
    .replace(/Need to/gi, 'Checking')
  
  // Remove "I'm" at start
  if (friendly.match(/^I'm\s+/i)) {
    friendly = friendly.replace(/^I'm\s+/i, '')
    friendly = friendly.charAt(0).toUpperCase() + friendly.slice(1)
  }
  
  // Remove multiple spaces
  friendly = friendly.replace(/\s+/g, ' ').trim()
  
  // Limit length for readability (shorter!)
  if (friendly.length > 80) {
    friendly = friendly.substring(0, 77) + '...'
  }
  
  return friendly
}

/**
 * Extract code blocks from message content
 */
export function extractCodeBlocks(content: string): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g
  const matches = content.match(codeBlockRegex)
  
  if (!matches) return []
  
  return matches.map(block => 
    block.replace(/```\w*\n?/, '').replace(/\n?```$/, '')
  )
}

/**
 * Check if content contains code
 */
export function hasCodeContent(content: string): boolean {
  return /```[\s\S]*?```/.test(content)
}

/**
 * Format terminal command for display
 */
export function formatCommand(command: string): string {
  return command.trim().replace(/\r?\n/g, ' ')
}

/**
 * Truncate long content with ellipsis
 */
export function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

/**
 * Parse THOUGHT|ACTION format from ReAct responses
 */
export function parseReActResponse(response: string): {
  thought: string
  action: string | null
  isDone: boolean
} {
  const thoughtMatch = response.match(/THOUGHT:\s*([\s\S]+?)(?=\nACTION:|$)/)
  const actionMatch = response.match(/ACTION:\s*([\s\S]+?)$/)
  
  const thought = thoughtMatch?.[1]?.trim() || 'Continuing task execution'
  const action = actionMatch?.[1]?.trim() || null
  
  // Check if task is complete
  const isDone = action === 'TASK_COMPLETE' || 
                 (typeof action === 'string' && action.toUpperCase().includes('TASK_COMPLETE'))
  
  return {
    thought,
    action: isDone ? null : action,
    isDone
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}

/**
 * Sanitize message content for display
 */
export function sanitizeContent(content: string): string {
  // Remove any potential XSS vectors while preserving formatting
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

/**
 * Detect if message is a system message
 */
export function isSystemMessage(content: string): boolean {
  return content.startsWith('🤖') || 
         content.startsWith('⚡') ||
         content.startsWith('🔍') ||
         content.includes('**Autonomous Terminal Agent') ||
         content.includes('**Execution Summary:**')
}

/**
 * Extract error messages from content
 */
export function extractErrors(content: string): string[] {
  const errorPatterns = [
    /error:\s*(.+)/gi,
    /exception:\s*(.+)/gi,
    /failed:\s*(.+)/gi,
    /denied:\s*(.+)/gi
  ]
  
  const errors: string[] = []
  
  for (const pattern of errorPatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) {
        errors.push(match[1].trim())
      }
    }
  }
  
  return errors
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

