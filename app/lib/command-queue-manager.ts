// Command Queue Manager - Centralized Command Execution Coordination
// Prevents command conflicts between agent and user, ensures ordered execution

import { sharedTerminalState, QueuedCommand } from './shared-terminal-state'
import { agentTerminalBridge } from './agent-terminal-bridge'

export interface CommandItem {
  id: string
  command: string
  source: 'user' | 'agent'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: Date
  retryCount: number
  maxRetries: number
  timeout: number
  explanation?: string
  category?: CommandCategory
  dependencies?: string[]
  rollbackCommand?: string
}

export interface CommandResult {
  commandId: string
  command: string
  success: boolean
  duration: number
  output?: string
  error?: string
  exitCode: number
  source: 'user' | 'agent'
  completedAt: Date
}

export interface QueueStats {
  total: number
  pending: number
  executing: number
  failed: number
  completed: number
  averageTime: number
  throughput: number
  errorRate: number
}

export type CommandCategory = 
  | 'system' | 'file' | 'network' | 'service' | 'package' | 'security' | 'monitoring' | 'other'

export type ExecutionPolicy = 
  | 'immediate' | 'queued' | 'batch' | 'scheduled'

export class CommandQueueManager {
  private static instance: CommandQueueManager
  private executionQueue: CommandItem[] = []
  private executionHistory: CommandResult[] = []
  private isProcessing = false
  private currentExecution?: CommandItem
  private socket?: any
  private processingInterval?: NodeJS.Timeout
  
  // Command execution policies
  private executionPolicies = new Map<CommandCategory, ExecutionPolicy>([
    ['system', 'immediate'],
    ['service', 'queued'],
    ['package', 'queued'],
    ['file', 'immediate'],
    ['network', 'queued'],
    ['security', 'immediate'],
    ['monitoring', 'immediate'],
    ['other', 'queued']
  ])

  // Command priorities for automatic prioritization
  private commandPriorities = new Map<string, 'low' | 'medium' | 'high' | 'urgent'>([
    // Urgent commands
    ['sudo shutdown', 'urgent'],
    ['sudo reboot', 'urgent'],
    ['kill -9', 'urgent'],
    ['sudo systemctl stop', 'urgent'],
    
    // High priority commands
    ['sudo systemctl start', 'high'],
    ['sudo systemctl restart', 'high'],
    ['sudo apt install', 'high'],
    ['sudo service', 'high'],
    ['sudo firewall', 'high'],
    
    // Medium priority commands
    ['systemctl status', 'medium'],
    ['ps aux', 'medium'],
    ['top', 'medium'],
    ['htop', 'medium'],
    ['free', 'medium'],
    ['df', 'medium'],
    
    // Low priority commands
    ['ls', 'low'],
    ['cat', 'low'],
    ['pwd', 'low'],
    ['whoami', 'low'],
    ['history', 'low']
  ])

  private constructor() {
    this.startProcessingLoop()
  }

  static getInstance(): CommandQueueManager {
    if (!CommandQueueManager.instance) {
      CommandQueueManager.instance = new CommandQueueManager()
    }
    return CommandQueueManager.instance
  }

  // Initialize with socket connection
  initialize(socket: any): void {
    this.socket = socket
    console.log('📋 Command Queue Manager initialized with socket')
  }

  // Add command to queue with intelligent prioritization
  enqueueCommand(
    command: string, 
    source: 'user' | 'agent',
    options: {
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      explanation?: string
      timeout?: number
      maxRetries?: number
      rollbackCommand?: string
    } = {}
  ): string {
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    
    // Intelligent priority detection
    const detectedPriority = this.detectCommandPriority(command)
    const priority = options.priority || detectedPriority
    
    const commandItem: CommandItem = {
      id: commandId,
      command: command.trim(),
      source,
      priority,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || this.getDefaultMaxRetries(command),
      timeout: options.timeout || this.getDefaultTimeout(command),
      explanation: options.explanation,
      category: this.categorizeCommand(command),
      rollbackCommand: options.rollbackCommand
    }

    // Insert into queue based on priority
    this.insertByPriority(commandItem)
    
    // Update shared state
    const state = sharedTerminalState.getState()
    const updatedQueue = [...state.commandQueue, {
      id: commandId,
      command,
      source,
      priority,
      timestamp: new Date(),
      retryCount: 0
    }]
    sharedTerminalState.updateState({ commandQueue: updatedQueue })

    console.log(`📥 Command queued: ${command} (priority: ${priority}, queue length: ${this.executionQueue.length})`)
    
    // Start processing if not already running
    this.processQueue()
    
    return commandId
  }

  // Process command queue with coordination
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    try {
      while (this.executionQueue.length > 0) {
        // Get next command
        const nextCommand = this.executionQueue.shift()
        if (!nextCommand) {
          break
        }

        // FIXED: User commands always execute immediately without waiting
        // Only agent commands wait for previous command to complete
        if (nextCommand.source === 'agent') {
          const state = sharedTerminalState.getState()
          if (state.isExecuting && state.lastCommandSource === 'user') {
            console.log('⏳ Agent waiting for user command to complete...')
            await this.waitForExecutionComplete()
          }
        }
        // User commands never wait - they can interrupt agent commands

        console.log(`🔧 Processing command: ${nextCommand.command} (${nextCommand.source})`)
        
        // Execute command with full coordination
        await this.executeCommandWithCoordination(nextCommand)
        
        // Small delay between commands (only for agent commands)
        if (nextCommand.source === 'agent') {
          await this.sleep(1000)
        } else {
          await this.sleep(100) // Minimal delay for user commands
        }
      }
    } catch (error) {
      console.error('❌ Queue processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Execute command with full coordination and monitoring
  private async executeCommandWithCoordination(commandItem: CommandItem): Promise<CommandResult> {
    this.currentExecution = commandItem
    
    try {
      console.log(`⚡ Executing: ${commandItem.command} (${commandItem.source})`)
      
      // Mark as executing in shared state
      sharedTerminalState.markCommandExecuting(commandItem.id, commandItem.command, commandItem.source)
      
      // Execute through bridge for coordination
      const result = await agentTerminalBridge.executeCommand(
        commandItem.command, 
        commandItem.source, 
        commandItem.explanation
      )
      
      // Create command result
      const commandResult: CommandResult = {
        commandId: commandItem.id,
        command: commandItem.command,
        success: result.success,
        duration: result.duration,
        output: result.output,
        error: result.error,
        exitCode: result.success ? 0 : 1,
        source: commandItem.source,
        completedAt: new Date()
      }
      
      // Add to history
      this.executionHistory.push(commandResult)
      if (this.executionHistory.length > 200) {
        this.executionHistory.shift()
      }
      
      // Handle failure with retries
      if (!result.success && commandItem.retryCount < commandItem.maxRetries) {
        console.log(`🔄 Command failed, retrying (${commandItem.retryCount + 1}/${commandItem.maxRetries}): ${commandItem.command}`)
        
        // Increment retry count and re-queue
        const retryCommand = { 
          ...commandItem, 
          retryCount: commandItem.retryCount + 1,
          timestamp: new Date()
        }
        
        // Add delay before retry
        await this.sleep(Math.pow(2, commandItem.retryCount) * 1000) // Exponential backoff
        
        this.insertByPriority(retryCommand)
      }
      
      this.currentExecution = undefined
      return commandResult

    } catch (error) {
      console.error(`❌ Command execution error: ${commandItem.command}`, error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      const failedResult: CommandResult = {
        commandId: commandItem.id,
        command: commandItem.command,
        success: false,
        duration: 0,
        error: errorMessage,
        exitCode: 1,
        source: commandItem.source,
        completedAt: new Date()
      }
      
      this.executionHistory.push(failedResult)
      this.currentExecution = undefined
      
      return failedResult
    }
  }

  // Intelligent command prioritization
  private detectCommandPriority(command: string): 'low' | 'medium' | 'high' | 'urgent' {
    const lowerCommand = command.toLowerCase().trim()
    
    // Check exact matches first
    for (const [pattern, priority] of this.commandPriorities) {
      if (lowerCommand.startsWith(pattern)) {
        return priority
      }
    }
    
    // Check for urgent patterns
    if (lowerCommand.includes('shutdown') || 
        lowerCommand.includes('reboot') ||
        lowerCommand.includes('kill -9') ||
        lowerCommand.includes('rm -rf')) {
      return 'urgent'
    }
    
    // Check for high priority patterns
    if (lowerCommand.includes('sudo') ||
        lowerCommand.includes('systemctl start') ||
        lowerCommand.includes('systemctl stop') ||
        lowerCommand.includes('service start') ||
        lowerCommand.includes('service stop')) {
      return 'high'
    }
    
    // Check for medium priority patterns
    if (lowerCommand.includes('install') ||
        lowerCommand.includes('update') ||
        lowerCommand.includes('configure') ||
        lowerCommand.includes('systemctl') ||
        lowerCommand.includes('service')) {
      return 'medium'
    }
    
    // Default to low priority
    return 'low'
  }

  // Categorize command for execution policies
  private categorizeCommand(command: string): CommandCategory {
    const lowerCommand = command.toLowerCase().trim()
    
    // System commands
    if (/^(sudo|su|systemctl|service|init)/.test(lowerCommand)) {
      return 'system'
    }
    
    // Package management
    if (/^(apt|yum|dnf|pacman|zypper|pip|npm|yarn)/.test(lowerCommand)) {
      return 'package'
    }
    
    // File operations
    if (/^(ls|cp|mv|rm|mkdir|touch|chmod|chown|find|locate)/.test(lowerCommand)) {
      return 'file'
    }
    
    // Network operations
    if (/^(ping|wget|curl|ssh|scp|rsync|netstat|ss)/.test(lowerCommand)) {
      return 'network'
    }
    
    // Security operations
    if (/^(ufw|iptables|fail2ban|openssl|gpg)/.test(lowerCommand)) {
      return 'security'
    }
    
    // Monitoring commands
    if (/^(ps|top|htop|free|df|lsof|iostat|vmstat)/.test(lowerCommand)) {
      return 'monitoring'
    }
    
    return 'other'
  }

  // Get appropriate timeout for command
  private getDefaultTimeout(command: string): number {
    const category = this.categorizeCommand(command)
    
    const timeouts: Record<CommandCategory, number> = {
      'system': 30000,
      'service': 30000,
      'package': 300000, // Package operations can take long
      'file': 60000,
      'network': 30000,
      'security': 45000,
      'monitoring': 10000,
      'other': 30000
    }
    
    return timeouts[category]
  }

  // Get max retries for command
  private getDefaultMaxRetries(command: string): number {
    if (command.toLowerCase().includes('rm') || 
        command.toLowerCase().includes('delete') ||
        command.toLowerCase().includes('shutdown')) {
      return 0 // No retries for destructive commands
    }
    
    const category = this.categorizeCommand(command)
    
    const retries: Record<CommandCategory, number> = {
      'system': 2,
      'service': 3,
      'package': 2,
      'file': 1,
      'network': 3,
      'security': 1,
      'monitoring': 3,
      'other': 2
    }
    
    return retries[category]
  }

  // Insert command by priority
  private insertByPriority(commandItem: CommandItem): void {
    const priorityValues = { urgent: 4, high: 3, medium: 2, low: 1 }
    const itemPriority = priorityValues[commandItem.priority]
    
    let insertIndex = this.executionQueue.length
    
    // Find insertion point based on priority
    for (let i = 0; i < this.executionQueue.length; i++) {
      const queuePriority = priorityValues[this.executionQueue[i].priority]
      if (itemPriority > queuePriority) {
        insertIndex = i
        break
      }
    }
    
    this.executionQueue.splice(insertIndex, 0, commandItem)
  }

  // Wait for current execution to complete
  private async waitForExecutionComplete(): Promise<void> {
    return new Promise((resolve) => {
      const checkExecution = () => {
        const state = sharedTerminalState.getState()
        if (!state.isExecuting) {
          resolve()
        } else {
          setTimeout(checkExecution, 500)
        }
      }
      
      checkExecution()
    })
  }

  // Start processing loop
  private startProcessingLoop(): void {
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.executionQueue.length > 0) {
        await this.processQueue()
      }
    }, 1000)
  }

  // Queue management methods
  getQueueStats(): QueueStats {
    const totalCommands = this.executionHistory.length
    const failedCommands = this.executionHistory.filter(cmd => !cmd.success).length
    const completedCommands = this.executionHistory.filter(cmd => cmd.success).length
    
    const totalDuration = this.executionHistory.reduce((sum, cmd) => sum + cmd.duration, 0)
    const averageTime = totalCommands > 0 ? totalDuration / totalCommands : 0
    
    // Calculate throughput (commands per minute)
    const recentCommands = this.executionHistory.filter(cmd => 
      Date.now() - cmd.completedAt.getTime() < 60000
    )
    const throughput = recentCommands.length

    return {
      total: totalCommands,
      pending: this.executionQueue.length,
      executing: this.currentExecution ? 1 : 0,
      failed: failedCommands,
      completed: completedCommands,
      averageTime: Math.round(averageTime),
      throughput,
      errorRate: totalCommands > 0 ? Math.round((failedCommands / totalCommands) * 100) : 0
    }
  }

  // Get queue status for UI
  getQueueStatus(): { 
    pending: CommandItem[]
    executing?: CommandItem
    recent: CommandResult[]
    stats: QueueStats 
  } {
    return {
      pending: [...this.executionQueue],
      executing: this.currentExecution,
      recent: this.executionHistory.slice(-10),
      stats: this.getQueueStats()
    }
  }

  // Priority queue operations
  promotePriority(commandId: string): boolean {
    const commandIndex = this.executionQueue.findIndex(cmd => cmd.id === commandId)
    if (commandIndex === -1) return false

    const command = this.executionQueue[commandIndex]
    const priorities = ['low', 'medium', 'high', 'urgent'] as const
    const currentIndex = priorities.indexOf(command.priority)
    
    if (currentIndex < priorities.length - 1) {
      command.priority = priorities[currentIndex + 1]
      
      // Re-sort queue
      this.executionQueue.splice(commandIndex, 1)
      this.insertByPriority(command)
      
      console.log(`⬆️ Promoted command priority: ${command.command} → ${command.priority}`)
      return true
    }
    
    return false
  }

  // Remove command from queue
  removeFromQueue(commandId: string): boolean {
    const initialLength = this.executionQueue.length
    this.executionQueue = this.executionQueue.filter(cmd => cmd.id !== commandId)
    
    const removed = this.executionQueue.length < initialLength
    if (removed) {
      console.log(`🗑️ Removed command from queue: ${commandId}`)
    }
    
    return removed
  }

  // Clear entire queue
  clearQueue(source?: 'user' | 'agent'): number {
    const initialLength = this.executionQueue.length
    
    if (source) {
      this.executionQueue = this.executionQueue.filter(cmd => cmd.source !== source)
    } else {
      this.executionQueue = []
    }
    
    const removed = initialLength - this.executionQueue.length
    console.log(`🗑️ Cleared ${removed} commands from queue ${source ? `(source: ${source})` : ''}`)
    
    return removed
  }

  // Pause queue processing
  pauseQueue(): void {
    this.isProcessing = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = undefined
    }
    console.log('⏸️ Command queue paused')
  }

  // Resume queue processing
  resumeQueue(): void {
    if (!this.processingInterval) {
      this.startProcessingLoop()
      console.log('▶️ Command queue resumed')
    }
  }

  // Emergency stop - halt all execution
  emergencyStop(): void {
    console.log('🛑 Emergency stop - halting all command execution')
    
    // Clear queue
    const cleared = this.clearQueue()
    
    // Stop current execution
    if (this.currentExecution && this.socket) {
      this.socket.emit('input', '\x03') // Send Ctrl+C
    }
    
    // Pause processing
    this.pauseQueue()
    
    // Update shared state
    sharedTerminalState.updateState({
      isExecuting: false,
      commandQueue: [],
      agentStatus: 'emergency_stopped'
    })
    
    console.log(`🛑 Emergency stop complete - cleared ${cleared} commands`)
  }

  // Batch command execution
  async executeBatch(commands: string[], source: 'user' | 'agent', options: { 
    stopOnError?: boolean
    parallel?: boolean
    delayBetween?: number
  } = {}): Promise<CommandResult[]> {
    console.log(`📦 Executing batch of ${commands.length} commands (${source})`)
    
    const results: CommandResult[] = []
    
    if (options.parallel) {
      // Parallel execution (use with caution)
      const promises = commands.map(command => 
        agentTerminalBridge.executeCommand(command, source)
      )
      
      const batchResults = await Promise.allSettled(promises)
      
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i]
        const commandResult: CommandResult = {
          commandId: `batch_${i}`,
          command: commands[i],
          success: result.status === 'fulfilled',
          duration: 0,
          output: result.status === 'fulfilled' ? result.value.output : undefined,
          error: result.status === 'rejected' ? result.reason.toString() : undefined,
          exitCode: result.status === 'fulfilled' ? 0 : 1,
          source,
          completedAt: new Date()
        }
        
        results.push(commandResult)
      }
    } else {
      // Sequential execution
      for (let i = 0; i < commands.length; i++) {
        try {
          const command = commands[i]
          const result = await agentTerminalBridge.executeCommand(command, source)
          
          const commandResult: CommandResult = {
            commandId: `batch_${i}`,
            command,
            success: result.success,
            duration: result.duration,
            output: result.output,
            error: result.error,
            exitCode: result.success ? 0 : 1,
            source,
            completedAt: new Date()
          }
          
          results.push(commandResult)
          
          // Stop on error if configured
          if (!result.success && options.stopOnError) {
            console.log(`❌ Batch execution stopped on error: ${command}`)
            break
          }
          
          // Delay between commands
          if (options.delayBetween && i < commands.length - 1) {
            await this.sleep(options.delayBetween)
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          results.push({
            commandId: `batch_${i}`,
            command: commands[i],
            success: false,
            duration: 0,
            error: errorMessage,
            exitCode: 1,
            source,
            completedAt: new Date()
          })
          
          if (options.stopOnError) {
            break
          }
        }
      }
    }
    
    console.log(`📊 Batch execution complete: ${results.filter(r => r.success).length}/${results.length} successful`)
    return results
  }

  // Get execution history with filtering
  getExecutionHistory(options: {
    source?: 'user' | 'agent'
    success?: boolean
    limit?: number
    category?: CommandCategory
  } = {}): CommandResult[] {
    let filtered = [...this.executionHistory]
    
    if (options.source) {
      filtered = filtered.filter(cmd => cmd.source === options.source)
    }
    
    if (options.success !== undefined) {
      filtered = filtered.filter(cmd => cmd.success === options.success)
    }
    
    if (options.limit) {
      filtered = filtered.slice(-options.limit)
    }
    
    return filtered
  }

  // Performance analysis
  analyzePerformance(): {
    commandsPerMinute: number
    averageExecutionTime: number
    errorRate: number
    topSlowCommands: { command: string; avgDuration: number }[]
    topFailingCommands: { command: string; failureRate: number }[]
  } {
    const recentCommands = this.executionHistory.filter(cmd => 
      Date.now() - cmd.completedAt.getTime() < 3600000 // Last hour
    )
    
    if (recentCommands.length === 0) {
      return {
        commandsPerMinute: 0,
        averageExecutionTime: 0,
        errorRate: 0,
        topSlowCommands: [],
        topFailingCommands: []
      }
    }
    
    // Commands per minute
    const timeSpan = Math.max(1, (Date.now() - recentCommands[recentCommands.length - 1].completedAt.getTime()) / 60000)
    const commandsPerMinute = recentCommands.length / timeSpan
    
    // Average execution time
    const totalTime = recentCommands.reduce((sum, cmd) => sum + cmd.duration, 0)
    const averageExecutionTime = totalTime / recentCommands.length
    
    // Error rate
    const failedCommands = recentCommands.filter(cmd => !cmd.success).length
    const errorRate = (failedCommands / recentCommands.length) * 100
    
    // Analyze slow commands
    const commandStats = new Map<string, { totalTime: number; count: number; failures: number }>()
    
    for (const cmd of recentCommands) {
      const baseCommand = cmd.command.split(' ')[0]
      const stats = commandStats.get(baseCommand) || { totalTime: 0, count: 0, failures: 0 }
      
      stats.totalTime += cmd.duration
      stats.count += 1
      if (!cmd.success) stats.failures += 1
      
      commandStats.set(baseCommand, stats)
    }
    
    const topSlowCommands = Array.from(commandStats.entries())
      .map(([command, stats]) => ({
        command,
        avgDuration: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5)
    
    const topFailingCommands = Array.from(commandStats.entries())
      .filter(([, stats]) => stats.count > 1)
      .map(([command, stats]) => ({
        command,
        failureRate: (stats.failures / stats.count) * 100
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 5)
    
    return {
      commandsPerMinute: Math.round(commandsPerMinute * 100) / 100,
      averageExecutionTime: Math.round(averageExecutionTime),
      errorRate: Math.round(errorRate * 100) / 100,
      topSlowCommands,
      topFailingCommands
    }
  }

  // Utility method
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Public interface methods
  
  getQueueLength(): number {
    return this.executionQueue.length
  }

  isExecuting(): boolean {
    return !!this.currentExecution
  }

  getCurrentCommand(): string | null {
    return this.currentExecution?.command || null
  }

  // Check if specific command is in queue
  isCommandQueued(command: string): boolean {
    return this.executionQueue.some(cmd => cmd.command === command)
  }

  // Get estimated execution time for queue
  getEstimatedQueueTime(): number {
    const stats = this.getQueueStats()
    return this.executionQueue.length * stats.averageTime
  }

  // Force execute command (bypass queue for urgent situations)
  async forceExecute(command: string, source: 'user' | 'agent'): Promise<CommandResult> {
    console.log(`⚡ Force executing: ${command}`)
    
    // Stop current execution if any
    if (this.currentExecution) {
      this.socket?.emit('input', '\x03') // Ctrl+C
      await this.sleep(1000)
    }
    
    // Create urgent command item
    const commandItem: CommandItem = {
      id: `force_${Date.now()}`,
      command,
      source,
      priority: 'urgent',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 0,
      timeout: 30000,
      category: this.categorizeCommand(command)
    }
    
    return await this.executeCommandWithCoordination(commandItem)
  }
}

// Export singleton instance (class already exported above)
export const commandQueueManager = CommandQueueManager.getInstance()
