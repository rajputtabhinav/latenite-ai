/**
 * Terminal Context Utilities
 * Intelligent dynamic terminal context system
 * Adapts from 10 to 10,000 lines based on actual output
 */

import { AGENT_CONFIG } from '../../../lib/constants/agent-config'

/**
 * Smart compression: Remove repetitive output
 */
export function compressTerminalContext(lines: string[]): string[] {
  const compressed: string[] = []
  let repeatCount = 0
  let lastLine = ''
  
  for (const line of lines) {
    if (line === lastLine && line.trim() !== '') {  // Don't compress empty lines
      repeatCount++
    } else {
      if (repeatCount > 3) {
        compressed.push(`... [line repeated ${repeatCount} times] ...`)
      } else {
        for (let i = 0; i < repeatCount; i++) {
          compressed.push(lastLine)
        }
      }
      compressed.push(line)
      lastLine = line
      repeatCount = 1
    }
  }
  
  // Handle last repeated sequence
  if (repeatCount > 3) {
    compressed.push(`... [line repeated ${repeatCount} times] ...`)
  } else {
    for (let i = 1; i < repeatCount; i++) {
      compressed.push(lastLine)
    }
  }
  
  if (compressed.length < lines.length) {
    console.log(`🗜️ Compression: ${lines.length} → ${compressed.length} lines (${Math.round((1 - compressed.length/lines.length) * 100)}% reduction)`)
  }
  
  return compressed
}

/**
 * Intelligent dynamic terminal context with pattern detection
 */
export function getDynamicTerminalContext(
  terminalHistory: string[],
  minLines: number = AGENT_CONFIG.MIN_TERMINAL_LINES,
  maxLines: number = AGENT_CONFIG.MAX_TERMINAL_LINES,
  enableCompression: boolean = true
): string[] {
  if (terminalHistory.length === 0) return []
  
  // Step 1: Analyze recent output characteristics
  const recentLines = terminalHistory.slice(-100).join('\n')
  const totalLines = terminalHistory.length
  
  // Step 2: Detect output patterns
  const hasErrors = /error|failed|exception|denied|not found|cannot|fatal/i.test(recentLines)
  const hasLargeOutput = recentLines.length > AGENT_CONFIG.LARGE_OUTPUT_THRESHOLD
  const hasMultilineOutput = recentLines.split('\n').length > AGENT_CONFIG.MULTILINE_THRESHOLD
  const hasCode = /```|function|class|import|export|const |let |var |def |public |private /i.test(recentLines)
  const hasLogs = /\d{4}-\d{2}-\d{2}|\[INFO\]|\[ERROR\]|\[DEBUG\]|\[WARN\]/i.test(recentLines)
  const isInteractive = /\[Y\/n\]|\(y\/N\)|continue\?|press enter|waiting/i.test(recentLines)
  const hasJSON = /^\s*[{[]/.test(recentLines.trim()) && /[}\]]\s*$/.test(recentLines.trim())
  const hasTable = /\|.*\||\+[-+]+\+|═.*═/i.test(recentLines)
  
  // Step 3: Calculate optimal context size
  let optimalLines = minLines  // Start with minimum
  
  // Adjust based on patterns
  if (hasErrors) {
    optimalLines = Math.max(optimalLines, AGENT_CONFIG.ERROR_CONTEXT_LINES)
    console.log('🔍 Dynamic context: Error detected, using more lines')
  }
  
  if (hasLargeOutput) {
    optimalLines = Math.max(optimalLines, AGENT_CONFIG.LARGE_OUTPUT_LINES)
    console.log('📊 Dynamic context: Large output detected, using more lines')
  }
  
  if (hasMultilineOutput) {
    optimalLines = Math.max(optimalLines, AGENT_CONFIG.MULTILINE_CONTEXT_LINES)
    console.log('📝 Dynamic context: Multi-line output, using more lines')
  }
  
  if (hasCode) {
    optimalLines = Math.max(optimalLines, AGENT_CONFIG.CODE_CONTEXT_LINES)
    console.log('💻 Dynamic context: Code detected, using more lines')
  }
  
  if (hasLogs) {
    optimalLines = Math.max(optimalLines, AGENT_CONFIG.LOG_CONTEXT_LINES)
    console.log('📋 Dynamic context: Logs detected, using more lines')
  }
  
  if (isInteractive) {
    optimalLines = Math.max(optimalLines, AGENT_CONFIG.INTERACTIVE_CONTEXT_LINES)
    console.log('🔔 Dynamic context: Interactive prompt, using specific lines')
  }
  
  if (hasJSON) {
    optimalLines = Math.max(optimalLines, AGENT_CONFIG.JSON_CONTEXT_LINES)
    console.log('📄 Dynamic context: JSON output, using specific lines')
  }
  
  if (hasTable) {
    optimalLines = Math.max(optimalLines, AGENT_CONFIG.TABLE_CONTEXT_LINES)
    console.log('📊 Dynamic context: Table output, using specific lines')
  }
  
  // Step 4: Adjust based on actual available lines
  optimalLines = Math.min(optimalLines, totalLines, maxLines)
  
  // Step 5: Get context and optionally compress
  let context = terminalHistory.slice(-optimalLines)
  
  if (enableCompression && context.length > 50) {
    context = compressTerminalContext(context)
  }
  
  // Step 6: Calculate token cost estimate
  const contextString = context.join('\n')
  const estimatedTokens = Math.ceil(contextString.length / 4)
  
  console.log(`📊 Dynamic terminal context: ${context.length} lines (~${estimatedTokens} tokens) from ${totalLines} available`)
  console.log(`   Patterns: errors=${hasErrors}, large=${hasLargeOutput}, code=${hasCode}, logs=${hasLogs}, interactive=${isInteractive}`)
  
  return context
}

/**
 * Command-aware context: Adjust based on command type
 */
export function getCommandAwareContext(
  terminalHistory: string[],
  command: string = ''
): string[] {
  // Commands that need minimal context
  const simpleCommands = ['whoami', 'pwd', 'date', 'hostname', 'uptime', 'clear', 'echo', 'cd']
  
  // Commands that need extensive context
  const complexCommands = ['npm install', 'yarn install', 'docker logs', 'tail -f', 'grep -r', 'find', 'docker-compose', 'kubectl logs']
  
  // Commands that produce structured output
  const structuredCommands = ['ls -l', 'ps aux', 'netstat', 'df -h', 'top', 'htop', 'git status', 'git log']
  
  const cmdLower = command.toLowerCase()
  
  if (simpleCommands.some(cmd => cmdLower.startsWith(cmd))) {
    console.log(`🎯 Command-aware: Simple command "${command}", using minimal context`)
    return getDynamicTerminalContext(terminalHistory, 5, 20, false)  // Minimal, no compression needed
  }
  
  if (complexCommands.some(cmd => cmdLower.includes(cmd))) {
    console.log(`🎯 Command-aware: Complex command "${command}", using extensive context`)
    return getDynamicTerminalContext(terminalHistory, 100, 5000, true)  // Extensive with compression
  }
  
  if (structuredCommands.some(cmd => cmdLower.includes(cmd))) {
    console.log(`🎯 Command-aware: Structured command "${command}", using moderate context`)
    return getDynamicTerminalContext(terminalHistory, 20, 200, false)  // Moderate, keep structure
  }
  
  // Default dynamic behavior
  console.log(`🎯 Command-aware: Standard command "${command}", using dynamic context`)
  return getDynamicTerminalContext(terminalHistory, 10, 500, true)
}

/**
 * Incremental context: Only send NEW output since last message
 */
export function getIncrementalContext(
  terminalHistory: string[],
  lastSentTerminalLine: number
): { context: string[], isIncremental: boolean } {
  const totalLines = terminalHistory.length
  const newLinesCount = totalLines - lastSentTerminalLine
  
  // If no new lines, use minimal context
  if (newLinesCount <= 0) {
    console.log(`📊 Incremental context: No new output, using minimal context`)
    return {
      context: getDynamicTerminalContext(terminalHistory, 5, 20, false),
      isIncremental: false
    }
  }
  
  // If too much new data, use dynamic context instead
  if (newLinesCount > 1000) {
    console.log(`📊 Incremental context: Too much new data (${newLinesCount} lines), using dynamic context`)
    return {
      context: getDynamicTerminalContext(terminalHistory, 10, 1000, true),
      isIncremental: false
    }
  }
  
  // Send new lines + small recent context for continuity
  const contextSize = Math.min(10, lastSentTerminalLine)
  const context = [
    ...terminalHistory.slice(Math.max(0, lastSentTerminalLine - contextSize), lastSentTerminalLine),
    ...terminalHistory.slice(lastSentTerminalLine)
  ]
  
  const estimatedTokens = Math.ceil(context.join('\n').length / 4)
  console.log(`📊 Incremental context: ${newLinesCount} new lines + ${contextSize} context (~${estimatedTokens} tokens)`)
  console.log(`   Savings vs full: ${Math.round((1 - newLinesCount / totalLines) * 100)}%`)
  
  return {
    context: compressTerminalContext(context),
    isIncremental: true
  }
}

/**
 * Helper: Get smart context for chat (comprehensive, incremental)
 */
export function getChatTerminalContext(
  terminalHistory: string[],
  lastSentTerminalLine: number,
  lastCommand: string
): string[] {
  // Try incremental first for better efficiency
  const { context, isIncremental } = getIncrementalContext(terminalHistory, lastSentTerminalLine)
  
  if (isIncremental && context.length < 500) {
    return context  // Use incremental if reasonable
  }
  
  // Fall back to command-aware or dynamic
  if (lastCommand) {
    return getCommandAwareContext(terminalHistory, lastCommand)
  }
  
  return getDynamicTerminalContext(terminalHistory, 10, 1000, true)  // 10-1000 for chat with compression
}

/**
 * Helper: Get smart context for terminal tasks (focused)
 */
export function getTaskTerminalContext(
  terminalHistory: string[],
  lastCommand: string
): string[] {
  // Terminal tasks benefit from command-aware context
  if (lastCommand) {
    return getCommandAwareContext(terminalHistory, lastCommand)
  }
  
  return getDynamicTerminalContext(terminalHistory, 10, 300, true)  // 10-300 for tasks with compression
}

/**
 * Helper: Get smart context for OS detection (minimal)
 */
export function getOSDetectionContext(terminalHistory: string[]): string[] {
  return getDynamicTerminalContext(terminalHistory, 5, 50, false)  // 5-50 for OS detection, no compression
}

/**
 * UNIVERSAL OS DETECTION - Works with Windows, Linux, macOS, Docker, K8s, AWS, Azure, GCP, etc.
 */
export function getNewlineForPlatform(terminalHistory: string[]): string {
  const recentTerminal = getOSDetectionContext(terminalHistory).join('')  // Use smart context
  
  // Windows detection (local Windows, Windows Server, Remote Desktop)
  const isWindows = 
    /C:\\|D:\\|E:\\/.test(recentTerminal) ||                    // Drive letters
    /Users\\|Windows\\|Program Files/i.test(recentTerminal) ||  // Windows paths
    /@ASUS|@DESKTOP|@LAPTOP/i.test(recentTerminal) ||          // Windows hostnames
    /Microsoft Windows/i.test(recentTerminal) ||                // Version banner
    /PS\s+[A-Z]:\\/i.test(recentTerminal) ||                    // PowerShell prompt
    /cmd\.exe|powershell/i.test(recentTerminal)                 // Windows shells
  
  // Linux/Unix detection (includes Docker, K8s, Cloud VMs)
  const isLinux = 
    /[\w-]+@[\w-]+:~?[$#]/.test(recentTerminal) ||             // user@host:path$
    /root@/.test(recentTerminal) ||                             // Root user
    /\/home\/|\/root\/|\/opt\/|\/usr\//.test(recentTerminal) || // Unix paths
    /ubuntu|debian|centos|alpine|fedora/i.test(recentTerminal) // Linux distros
  
  // macOS detection
  const isMac = 
    /darwin/i.test(recentTerminal) ||
    /\/Users\//.test(recentTerminal)
  
  // Container/Cloud detection (they use Linux conventions)
  const isContainer = 
    /docker|container/.test(recentTerminal) ||
    /root@[a-f0-9]{12}/.test(recentTerminal) ||                 // Docker container ID
    /[\w-]+-[\w-]+-[\w-]+/.test(recentTerminal)                 // K8s pod name pattern
  
  const isCloud = 
    /ec2-user@|ubuntu@ip-/.test(recentTerminal) ||             // AWS
    /azureuser@/.test(recentTerminal) ||                        // Azure
    /gcp-|compute@/.test(recentTerminal)                        // GCP
  
  // Determine newline based on OS
  // Windows uses \r\n, everything else (Linux, Mac, Docker, K8s, Cloud) uses \n
  const newline = isWindows ? '\r\n' : '\n'
  
  // Logging for debugging
  const detectedOS = isWindows ? 'Windows' : 
                     isContainer ? 'Container/Docker/K8s' :
                     isCloud ? 'Cloud (AWS/Azure/GCP)' :
                     isMac ? 'macOS' :
                     isLinux ? 'Linux/Unix' : 
                     'Unknown (defaulting to Unix)'
  
  console.log(`🖥️ Detected OS: ${detectedOS}, newline: ${JSON.stringify(newline)}`)
  
  return newline
}

