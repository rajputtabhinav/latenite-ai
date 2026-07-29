// Shared Terminal State Manager - Perfect Agent-Terminal Synchronization
// Provides unified state management between AI agent and SSH terminal

export interface TerminalState {
  // Connection state
  isConnected: boolean
  isShellReady: boolean
  sessionId: string
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'
  
  // Current context
  currentPath: string
  currentUser: string
  currentHost: string
  shell: string
  
  // Command execution state
  isExecuting: boolean
  lastCommand: string
  lastCommandSource: 'user' | 'agent'
  lastOutput: string[]
  executionStartTime?: Date
  
  // Command history
  recentCommands: CommandHistoryItem[]
  commandQueue: QueuedCommand[]
  
  // System information
  systemHealth: SystemHealth
  permissions: UserPermissions
  
  // Agent integration
  agentConnected: boolean
  autonomousMode: boolean
  agentStatus: string
  
  // Error tracking
  errors: TerminalError[]
  lastError?: TerminalError
  
  // Performance metrics
  commandCount: number
  averageCommandTime: number
  errorRate: number
}

export interface CommandHistoryItem {
  command: string
  timestamp: Date
  source: 'user' | 'agent'
  duration: number
  success: boolean
  output?: string
  error?: string
}

export interface QueuedCommand {
  id: string
  command: string
  source: 'user' | 'agent'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: Date
  retryCount: number
  explanation?: string
}

export interface SystemHealth {
  status: 'excellent' | 'good' | 'warning' | 'critical'
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkStatus: boolean
}

export interface UserPermissions {
  hasRoot: boolean
  hasSudo: boolean
  groups: string[]
  capabilities: string[]
}

export interface TerminalError {
  id: string
  command: string
  error: string
  timestamp: Date
  resolved: boolean
  attempts: number
}

export type StateChangeListener = (state: TerminalState, changes: Partial<TerminalState>) => void
export type OutputListener = (output: string, metadata: OutputMetadata) => void
export type CommandListener = (command: string, metadata: CommandMetadata) => void

export interface OutputMetadata {
  timestamp: Date
  source: 'ssh' | 'local' | 'system'
  commandId?: string
  isError: boolean
  isComplete: boolean
}

export interface CommandMetadata {
  source: 'user' | 'agent'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  id: string
  retryCount: number
}

export class SharedTerminalState {
  private static instance: SharedTerminalState
  private state: TerminalState
  private stateListeners: StateChangeListener[] = []
  private outputListeners: OutputListener[] = []
  private commandListeners: CommandListener[] = []
  private stateHistory: TerminalState[] = []

  private constructor() {
    this.state = this.initializeDefaultState()
  }

  static getInstance(): SharedTerminalState {
    if (!SharedTerminalState.instance) {
      SharedTerminalState.instance = new SharedTerminalState()
    }
    return SharedTerminalState.instance
  }

  // State management methods
  getState(): TerminalState {
    return { ...this.state }
  }

  updateState(changes: Partial<TerminalState>): void {
    const previousState = { ...this.state }
    this.state = { ...this.state, ...changes }
    
    // Store in history
    this.stateHistory.push(previousState)
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift()
    }
    
    // Notify all listeners
    this.notifyStateListeners(changes)
    
    console.log('🔄 Shared terminal state updated:', Object.keys(changes))
  }

  // Command management
  queueCommand(command: string, source: 'user' | 'agent', priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): string {
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const queuedCommand: QueuedCommand = {
      id: commandId,
      command: command.trim(),
      source,
      priority,
      timestamp: new Date(),
      retryCount: 0
    }

    // Insert based on priority
    const queue = [...this.state.commandQueue]
    const insertIndex = this.findInsertPosition(queue, priority)
    queue.splice(insertIndex, 0, queuedCommand)

    this.updateState({ commandQueue: queue })
    
    // Notify command listeners
    this.notifyCommandListeners(command, { source, priority, id: commandId, retryCount: 0 })
    
    return commandId
  }

  dequeueCommand(): QueuedCommand | null {
    const queue = [...this.state.commandQueue]
    const nextCommand = queue.shift()
    
    if (nextCommand) {
      this.updateState({ commandQueue: queue })
      return nextCommand
    }
    
    return null
  }

  markCommandExecuting(commandId: string, command: string, source: 'user' | 'agent'): void {
    this.updateState({
      isExecuting: true,
      lastCommand: command,
      lastCommandSource: source,
      executionStartTime: new Date()
    })
    
    // Remove from queue if it was queued
    const queue = this.state.commandQueue.filter(cmd => cmd.id !== commandId)
    if (queue.length !== this.state.commandQueue.length) {
      this.updateState({ commandQueue: queue })
    }
  }

  markCommandComplete(command: string, success: boolean, output?: string, error?: string): void {
    const duration = this.state.executionStartTime 
      ? Date.now() - this.state.executionStartTime.getTime()
      : 0

    // Add to command history
    const historyItem: CommandHistoryItem = {
      command,
      timestamp: new Date(),
      source: this.state.lastCommandSource,
      duration,
      success,
      output,
      error
    }

    const history = [...this.state.recentCommands, historyItem].slice(-50) // Keep last 50

    // Update state
    this.updateState({
      isExecuting: false,
      lastOutput: [output || error || ''],
      recentCommands: history,
      commandCount: this.state.commandCount + 1,
      averageCommandTime: this.calculateAverageCommandTime(history),
      errorRate: this.calculateErrorRate(history),
      executionStartTime: undefined
    })

    // Handle errors
    if (!success && error) {
      this.addError(command, error)
    }
  }

  // Output management
  processOutput(output: string, metadata: OutputMetadata): void {
    // Update last output
    this.updateState({ lastOutput: [output] })
    
    // Parse output for context updates
    this.parseOutputForContext(output)
    
    // Notify output listeners
    this.notifyOutputListeners(output, metadata)
    
    // Check for command completion
    if (this.state.isExecuting && metadata.isComplete) {
      this.markCommandComplete(
        this.state.lastCommand, 
        !metadata.isError, 
        metadata.isError ? undefined : output,
        metadata.isError ? output : undefined
      )
    }
  }

  // Error management
  addError(command: string, error: string): void {
    const terminalError: TerminalError = {
      id: `err_${Date.now()}`,
      command,
      error,
      timestamp: new Date(),
      resolved: false,
      attempts: 1
    }

    const errors = [...this.state.errors, terminalError].slice(-20) // Keep last 20 errors
    this.updateState({ 
      errors,
      lastError: terminalError
    })
  }

  resolveError(errorId: string): void {
    const errors = this.state.errors.map(err => 
      err.id === errorId ? { ...err, resolved: true } : err
    )
    this.updateState({ errors })
  }

  // Listener management
  onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.stateListeners.indexOf(listener)
      if (index > -1) {
        this.stateListeners.splice(index, 1)
      }
    }
  }

  onOutput(listener: OutputListener): () => void {
    this.outputListeners.push(listener)
    
    return () => {
      const index = this.outputListeners.indexOf(listener)
      if (index > -1) {
        this.outputListeners.splice(index, 1)
      }
    }
  }

  onCommand(listener: CommandListener): () => void {
    this.commandListeners.push(listener)
    
    return () => {
      const index = this.commandListeners.indexOf(listener)
      if (index > -1) {
        this.commandListeners.splice(index, 1)
      }
    }
  }

  // Private helper methods
  private initializeDefaultState(): TerminalState {
    return {
      isConnected: false,
      isShellReady: false,
      sessionId: '',
      connectionStatus: 'idle',
      currentPath: '~',
      currentUser: 'user',
      currentHost: 'localhost',
      shell: '/bin/bash',
      isExecuting: false,
      lastCommand: '',
      lastCommandSource: 'user',
      lastOutput: [],
      recentCommands: [],
      commandQueue: [],
      systemHealth: {
        status: 'good',
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkStatus: true
      },
      permissions: {
        hasRoot: false,
        hasSudo: false,
        groups: [],
        capabilities: []
      },
      agentConnected: false,
      autonomousMode: false,
      agentStatus: 'idle',
      errors: [],
      commandCount: 0,
      averageCommandTime: 0,
      errorRate: 0
    }
  }

  private notifyStateListeners(changes: Partial<TerminalState>): void {
    for (const listener of this.stateListeners) {
      try {
        listener(this.state, changes)
      } catch (error) {
        console.error('State listener error:', error)
      }
    }
  }

  private notifyOutputListeners(output: string, metadata: OutputMetadata): void {
    for (const listener of this.outputListeners) {
      try {
        listener(output, metadata)
      } catch (error) {
        console.error('Output listener error:', error)
      }
    }
  }

  private notifyCommandListeners(command: string, metadata: CommandMetadata): void {
    for (const listener of this.commandListeners) {
      try {
        listener(command, metadata)
      } catch (error) {
        console.error('Command listener error:', error)
      }
    }
  }

  private parseOutputForContext(output: string): void {
    // Parse prompt changes for path/user updates
    const promptMatch = output.match(/([^@\s]+)@([^:]+):([^$#]+)([$#])\s*$/)
    if (promptMatch) {
      const [, user, host, path, promptChar] = promptMatch
      
      const changes: Partial<TerminalState> = {}
      
      if (path !== this.state.currentPath) {
        changes.currentPath = path
      }
      
      if (user !== this.state.currentUser) {
        changes.currentUser = user
        changes.permissions = {
          ...this.state.permissions,
          hasRoot: promptChar === '#'
        }
      }
      
      if (host !== this.state.currentHost) {
        changes.currentHost = host
      }
      
      if (Object.keys(changes).length > 0) {
        this.updateState(changes)
      }
    }

    // Update system health from command outputs
    this.updateSystemHealthFromOutput(output)
  }

  private updateSystemHealthFromOutput(output: string): void {
    // Parse system health indicators from common commands
    if (output.includes('load average:')) {
      const loadMatch = output.match(/load average:\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)/)
      if (loadMatch) {
        const load1min = parseFloat(loadMatch[1])
        const cpuUsage = Math.min(load1min * 25, 100) // Rough estimation
        
        this.updateState({
          systemHealth: {
            ...this.state.systemHealth,
            cpuUsage
          }
        })
      }
    }

    if (output.includes('Mem:') || output.includes('Memory:')) {
      const memMatch = output.match(/Mem:\s+(\d+)\s+(\d+)\s+(\d+)/)
      if (memMatch) {
        const total = parseInt(memMatch[1])
        const used = parseInt(memMatch[2])
        const memoryUsage = total > 0 ? (used / total) * 100 : 0
        
        this.updateState({
          systemHealth: {
            ...this.state.systemHealth,
            memoryUsage
          }
        })
      }
    }
  }

  private findInsertPosition(queue: QueuedCommand[], priority: 'low' | 'medium' | 'high' | 'urgent'): number {
    const priorityValue = { urgent: 4, high: 3, medium: 2, low: 1 }
    const currentPriority = priorityValue[priority]
    
    for (let i = 0; i < queue.length; i++) {
      if (priorityValue[queue[i].priority] < currentPriority) {
        return i
      }
    }
    
    return queue.length
  }

  private calculateAverageCommandTime(history: CommandHistoryItem[]): number {
    if (history.length === 0) return 0
    
    const total = history.reduce((sum, item) => sum + item.duration, 0)
    return Math.round(total / history.length)
  }

  private calculateErrorRate(history: CommandHistoryItem[]): number {
    if (history.length === 0) return 0
    
    const errors = history.filter(item => !item.success).length
    return Math.round((errors / history.length) * 100)
  }

  // Utility methods for external components
  getCommandHistory(limit = 10): CommandHistoryItem[] {
    return this.state.recentCommands.slice(-limit)
  }

  getQueueLength(): number {
    return this.state.commandQueue.length
  }

  getCurrentContext(): { user: string; host: string; path: string; executing: boolean } {
    return {
      user: this.state.currentUser,
      host: this.state.currentHost,
      path: this.state.currentPath,
      executing: this.state.isExecuting
    }
  }

  getSystemStatus(): string {
    const state = this.state
    const health = state.systemHealth
    
    return [
      `📊 Terminal State: ${state.currentUser}@${state.currentHost}:${state.currentPath}`,
      `🔌 Connection: ${state.isConnected ? 'Connected' : 'Disconnected'} (${state.connectionStatus})`,
      `⚡ Executing: ${state.isExecuting ? state.lastCommand : 'None'}`,
      `🤖 Agent: ${state.agentConnected ? 'Connected' : 'Disconnected'} (${state.autonomousMode ? 'Autonomous' : 'Manual'})`,
      `📈 Performance: ${state.commandCount} commands, ${state.averageCommandTime}ms avg, ${state.errorRate}% error rate`,
      `🏥 System Health: ${health.status} (CPU: ${health.cpuUsage}%, Mem: ${health.memoryUsage}%, Disk: ${health.diskUsage}%)`,
      `📥 Queue: ${state.commandQueue.length} pending commands`,
      `🚨 Errors: ${state.errors.filter(e => !e.resolved).length} unresolved`
    ].join('\n')
  }

  // Reset state (for reconnections)
  reset(): void {
    this.state = this.initializeDefaultState()
    this.notifyStateListeners(this.state)
  }

  // Debug methods
  getStateHistory(): TerminalState[] {
    return [...this.stateHistory]
  }

  exportState(): string {
    return JSON.stringify(this.state, null, 2)
  }

  importState(stateJson: string): boolean {
    try {
      const importedState = JSON.parse(stateJson)
      this.state = { ...this.state, ...importedState }
      this.notifyStateListeners(this.state)
      return true
    } catch (error) {
      console.error('Failed to import state:', error)
      return false
    }
  }
}

// Export singleton instance (class already exported above)
export const sharedTerminalState = SharedTerminalState.getInstance()
