import { sharedTerminalState, OutputMetadata, CommandMetadata } from './shared-terminal-state'
import EventEmitter from 'events'
import { Socket } from 'socket.io-client'
import { ServerToClientEvents, ClientToServerEvents } from '../types/socket-types'

export interface CommandExecutionResult {
  commandId: string
  success: boolean
  duration: number
  output?: string
  error?: string
  exitCode?: number
}

export interface CompletionDetectionResult {
  isComplete: boolean
  hasError: boolean
  hasOutput: boolean
  confidence: number
  promptDetected: boolean
  errorType?: 'permission' | 'not_found' | 'syntax' | 'network' | 'system'
}

export interface BridgeEvents {
  'command:execute': (command: string, metadata: CommandMetadata) => void
  'command:complete': (result: CommandExecutionResult) => void
  'output:received': (output: string, metadata: OutputMetadata) => void
  'state:changed': (newState: any, changes: any) => void
  'error:detected': (error: any) => void
  'agent:connected': (agentId: string) => void
  'agent:disconnected': (agentId: string) => void
}

export class AgentTerminalBridge extends EventEmitter {
  private static instance: AgentTerminalBridge
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private activeCommands = new Map<string, { command: string; startTime: number; source: 'user' | 'agent' }>()
  private outputBuffer: string[] = []
  private lastPrompt = ''
  private completionDetector = new CommandCompletionDetector()
  private isInitialized = false

  private constructor() {
    super()
    this.setMaxListeners(50) // Allow many listeners
  }

  static getInstance(): AgentTerminalBridge {
    if (!AgentTerminalBridge.instance) {
      AgentTerminalBridge.instance = new AgentTerminalBridge()
    }
    return AgentTerminalBridge.instance
  }

  // Platform-aware newline detection for proper command execution
  private getNewlineForPlatform(): string {
    // Detect OS from recent terminal output
    const state = sharedTerminalState.getState()
    const currentPath = state.currentPath || ''
    const recentOutput = this.outputBuffer.slice(-10).join('')

    // Windows indicators - comprehensive detection
    const isWindows = /^[A-Z]:\\/.test(currentPath) ||
      currentPath.includes('\\') ||
      /C:\\|Users\\|asus@ASUS/i.test(recentOutput) ||
      /PS\s+[A-Z]:\\/i.test(recentOutput) ||
      /@ASUS/i.test(recentOutput) ||
      /Microsoft Windows/i.test(recentOutput)

    const newline = isWindows ? '\r\n' : '\n'
    console.log(`🖥️ Detected platform: ${isWindows ? 'Windows' : 'Linux/Unix'}, using newline: ${JSON.stringify(newline)}`)
    return newline
  }

  // Initialize bridge with SSH socket
  initialize(socket: Socket<ServerToClientEvents, ClientToServerEvents>): void {
    const wasInitialized = this.isInitialized

    // Always update socket reference (important for reconnections!)
    this.socket = socket

    if (!wasInitialized) {
      // First time initialization - setup listeners
      this.setupSocketListeners()
      this.setupStateListeners()
      this.isInitialized = true
      console.log('🚀 Agent-Terminal Bridge initialized with perfect sync')
    } else {
      // Re-initialization with new socket
      console.log('🔄 Agent-Terminal Bridge socket updated (reconnection)')
      // Re-setup socket listeners with new socket
      this.setupSocketListeners()
    }

    // Update shared state
    sharedTerminalState.updateState({
      agentConnected: true
    })
  }

  // Setup bidirectional WebSocket communication
  private setupSocketListeners(): void {
    if (!this.socket) return

    // Enhanced output handler with metadata
    this.socket.on('output', (data: string) => {
      this.processTerminalOutput(data)
    })

    // Command completion tracking
    this.socket.on('command:sent', ({ commandId, command }) => {
      console.log(`📤 Command sent: ${command} (ID: ${commandId})`)
      this.trackCommandStart(commandId, command)
    })

    // Command completion notification
    this.socket.on('command:complete', (result: CommandExecutionResult) => {
      console.log(`✅ Command completed: ${result.commandId}`)
      this.handleCommandComplete(result)
    })

    // Error handling
    this.socket.on('error', (error: any) => {
      this.handleTerminalError(error)
    })

    // Connection state changes
    this.socket.on('ready', () => {
      sharedTerminalState.updateState({
        isShellReady: true,
        connectionStatus: 'connected'
      })
    })

    this.socket.on('shell-closed', () => {
      sharedTerminalState.updateState({
        isConnected: false,
        isShellReady: false,
        connectionStatus: 'idle'
      })
    })
  }

  // Setup shared state listeners
  private setupStateListeners(): void {
    // Listen for state changes to emit bridge events
    sharedTerminalState.onStateChange((newState, changes) => {
      this.emit('state:changed', newState, changes)

      // Log significant changes
      if (changes.isExecuting !== undefined) {
        console.log(`🔄 Execution state: ${changes.isExecuting ? 'STARTED' : 'STOPPED'}`)
      }

      if (changes.currentPath) {
        console.log(`📂 Directory changed: ${changes.currentPath}`)
      }
    })
  }

  // Handle terminal output with intelligent processing (PUBLIC METHOD)
  processTerminalOutput(rawOutput: string): void {
    this.outputBuffer.push(rawOutput)

    // Keep buffer manageable
    if (this.outputBuffer.length > 1000) {
      this.outputBuffer = this.outputBuffer.slice(-500)
    }

    // Create output metadata
    const metadata: OutputMetadata = {
      timestamp: new Date(),
      source: 'ssh',
      isError: this.detectError(rawOutput),
      isComplete: false
    }

    // Detect command completion for active commands
    for (const [commandId, commandInfo] of this.activeCommands) {
      const executionTime = Date.now() - commandInfo.startTime

      // Don't detect completion too early (give command time to execute)
      if (executionTime < 500) {
        continue
      }

      const completionResult = this.completionDetector.detectCompletion(
        rawOutput,
        commandInfo.command,
        this.getRecentOutput()
      )

      if (completionResult.isComplete) {
        metadata.isComplete = true
        metadata.commandId = commandId

        // Get accumulated output from buffer
        const accumulatedOutput = this.outputBuffer.slice(-20).join('')

        // Calculate execution result
        const executionResult: CommandExecutionResult = {
          commandId,
          success: !completionResult.hasError,
          duration: executionTime,
          output: completionResult.hasError ? undefined : accumulatedOutput,
          error: completionResult.hasError ? accumulatedOutput : undefined
        }

        // Emit completion event
        this.emit('command:complete', executionResult)

        // Clean up active command tracking
        this.activeCommands.delete(commandId)

        break
      }
    }

    // Process output for shared state
    sharedTerminalState.processOutput(rawOutput, metadata)

    // Emit output event
    this.emit('output:received', rawOutput, metadata)

    // Update prompt tracking
    this.updatePromptTracking(rawOutput)
  }

  // Execute command with full tracking and coordination
  async executeCommand(command: string, source: 'user' | 'agent', explanation?: string): Promise<CommandExecutionResult> {
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    console.log(`🚀 Bridge executing: ${command} (source: ${source}, ID: ${commandId})`)

    // Check if terminal is ready - RELAXED check
    if (!this.socket) {
      throw new Error('WebSocket not connected')
    }

    // Get current state once
    const state = sharedTerminalState.getState()

    // Simple check: if socket is connected, we can send commands
    if (!this.socket.connected) {
      throw new Error('WebSocket not connected - reconnect SSH')
    }

    // FIXED: Only queue agent commands if another command is executing
    // User commands ALWAYS execute immediately (can interrupt agent)
    if (state.isExecuting && source === 'agent') {
      console.log(`⏳ Queuing agent command (user has priority): ${command}`)
      const queuedCommandId = sharedTerminalState.queueCommand(command, source, 'medium')

      // Wait for queued command to execute
      return await this.waitForQueuedCommand(queuedCommandId)
    }

    // User commands can interrupt agent commands - send Ctrl+C if agent is executing
    if (source === 'user' && state.isExecuting && state.lastCommandSource === 'agent') {
      console.log('⚠️ User interrupting agent command')
      this.socket.emit('input', '\x03') // Send Ctrl+C to interrupt agent command
      await this.sleep(100) // Brief delay for interrupt
    }

    // Mark command as executing
    sharedTerminalState.markCommandExecuting(commandId, command, source)

    // Track active command
    this.activeCommands.set(commandId, {
      command,
      startTime: Date.now(),
      source
    })

    try {
      // Wait for shell prompt before sending command (prevents concatenation)
      if (source === 'agent') {
        await this.waitForPrompt(3000) // Wait max 3 seconds for prompt
      }

      // Send command with platform-appropriate newline
      const newline = this.getNewlineForPlatform()
      this.socket.emit('input', command + newline)

      // Emit command execution event
      this.emit('command:execute', command, {
        source,
        priority: source === 'user' ? 'high' : 'medium', // User commands have higher priority
        id: commandId,
        retryCount: 0
      })

      // Wait for command completion with proper timeout
      return await this.waitForCommandCompletion(commandId, command)

    } catch (error) {
      // Clean up on error
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.activeCommands.delete(commandId)
      sharedTerminalState.markCommandComplete(command, false, undefined, errorMessage)

      throw error
    }
  }

  // Helper sleep function
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Wait for shell prompt before sending next command (prevents concatenation)
  private waitForPrompt(timeoutMs: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now()

      const checkPrompt = () => {
        const recentOutput = this.getRecentOutput(3)

        // Check for prompt patterns (Linux and Windows)
        const promptPatterns = [
          /([^@\s]+@[^:]+:[^$#]+[$#])\s*$/,           // Linux: user@host:path$
          /([A-Z]:\\[^>]*>)\s*$/,                      // Windows: C:\path>
          /PS\s+[A-Z]:\\[^>]*>\s*$/,                   // PowerShell: PS C:\path>
          /asus@ASUS\s+[A-Z]:\\[^>]*>\s*$/             // Windows SSH: asus@ASUS C:\path>
        ]

        const hasPrompt = promptPatterns.some(pattern => pattern.test(recentOutput))

        if (hasPrompt) {
          console.log('✅ Prompt detected, ready for next command')
          resolve()
          return
        }

        // Timeout check
        if (Date.now() - startTime > timeoutMs) {
          console.log('⚠️ Prompt wait timeout, proceeding anyway')
          resolve() // Don't fail, just proceed
          return
        }

        // Check again in 100ms
        setTimeout(checkPrompt, 100)
      }

      checkPrompt()
    })
  }

  // FIXED: Helper to determine appropriate timeout for command
  private getTimeoutForCommand(command: string): number {
    // Long-running commands need more time
    const longRunningPatterns = [
      { pattern: /apt.*install/i, timeout: 300000, name: 'package install (apt)' },
      { pattern: /yum.*install/i, timeout: 300000, name: 'package install (yum)' },
      { pattern: /dnf.*install/i, timeout: 300000, name: 'package install (dnf)' },
      { pattern: /npm.*install/i, timeout: 180000, name: 'npm install' },
      { pattern: /docker.*build/i, timeout: 600000, name: 'docker build' },
      { pattern: /git.*clone/i, timeout: 180000, name: 'git clone' },
      { pattern: /curl.*download/i, timeout: 180000, name: 'download' },
      { pattern: /wget/i, timeout: 180000, name: 'wget' },
    ]

    for (const { pattern, timeout, name } of longRunningPatterns) {
      if (pattern.test(command)) {
        console.log(`⏱️ Using ${timeout / 1000}s timeout for ${name}: ${command}`)
        return timeout
      }
    }

    // Interactive commands should fail fast (shouldn't timeout, should be exited properly)
    const interactivePatterns = /^(top|htop|vim|nano|less|more|vi)\s/
    if (interactivePatterns.test(command)) {
      console.log(`⏱️ Using 10s timeout for interactive command: ${command}`)
      return 10000
    }

    // Default timeout for normal commands
    console.log(`⏱️ Using default 60s timeout for: ${command}`)
    return 60000
  }

  // FIXED: Wait for command completion with proper timeout handling
  private waitForCommandCompletion(commandId: string, command?: string): Promise<CommandExecutionResult> {
    return new Promise((resolve, reject) => {
      let resolved = false
      let outputAccumulated = ''
      let outputCount = 0

      // Get appropriate timeout based on command type
      const commandInfo = this.activeCommands.get(commandId)
      const timeoutMs = command ? this.getTimeoutForCommand(command) :
        commandInfo?.command ? this.getTimeoutForCommand(commandInfo.command) : 60000

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          this.activeCommands.delete(commandId)

          // FIXED: Return FAILURE on timeout, not success
          const cmd = command || commandInfo?.command || 'unknown'
          console.warn(`⏰ Command timeout after ${timeoutMs / 1000}s: ${cmd}`)

          resolve({
            commandId,
            success: false,  // ✅ FIXED: Was true, now correctly false
            duration: timeoutMs,
            output: outputAccumulated || '',
            error: `Command timed out after ${timeoutMs / 1000} seconds. Output received: ${outputCount} chunks.`,
            exitCode: 124  // ✅ FIXED: Standard timeout exit code (was 0)
          })
        }
      }, timeoutMs)

      // Listen for output to accumulate
      const outputHandler = (data: string, metadata: OutputMetadata) => {
        if (!resolved) {
          outputAccumulated += data
          outputCount++
        }
      }

      // Listen for completion
      const completionHandler = (result: CommandExecutionResult) => {
        if (result.commandId === commandId && !resolved) {
          resolved = true
          clearTimeout(timeout)
          this.off('command:complete', completionHandler)
          this.off('output:received', outputHandler)

          // Use accumulated output if result doesn't have it
          if (!result.output && outputAccumulated) {
            result.output = outputAccumulated
          }

          resolve(result)
        }
      }

      this.on('command:complete', completionHandler)
      this.on('output:received', outputHandler)
    })
  }

  // Wait for queued command to execute
  private waitForQueuedCommand(commandId: string): Promise<CommandExecutionResult> {
    return new Promise((resolve, reject) => {
      const checkQueue = () => {
        const state = sharedTerminalState.getState()

        // Check if command is still in queue
        const inQueue = state.commandQueue.some(cmd => cmd.id === commandId)
        if (!inQueue) {
          // Command was processed, check history
          const historyItem = state.recentCommands.find(item =>
            item.command === state.lastCommand &&
            Math.abs(Date.now() - item.timestamp.getTime()) < 60000
          )

          if (historyItem) {
            resolve({
              commandId,
              success: historyItem.success,
              duration: historyItem.duration,
              output: historyItem.output,
              error: historyItem.error
            })
          } else {
            // Continue waiting
            setTimeout(checkQueue, 1000)
          }
        } else {
          // Still in queue, keep waiting
          setTimeout(checkQueue, 1000)
        }
      }

      // Start checking after a delay
      setTimeout(checkQueue, 500)

      // Timeout after 5 minutes for queued commands
      setTimeout(() => {
        reject(new Error('Queued command timeout'))
      }, 300000)
    })
  }

  // Intelligent error detection
  private detectError(output: string): boolean {
    const errorPatterns = [
      /error|failed|permission denied|command not found|no such file|access denied/i,
      /fatal:|critical:|emergency:|panic/i,
      /\berr\b|\bfail\b/i,
      /cannot|unable to|could not/i,
      /invalid|illegal|forbidden/i
    ]

    return errorPatterns.some(pattern => pattern.test(output))
  }

  // Track command execution start
  private trackCommandStart(commandId: string, command: string): void {
    if (!this.activeCommands.has(commandId)) {
      this.activeCommands.set(commandId, {
        command,
        startTime: Date.now(),
        source: 'user' // Default, will be updated if from agent
      })
    }
  }

  // Handle command completion
  private handleCommandComplete(result: CommandExecutionResult): void {
    const commandInfo = this.activeCommands.get(result.commandId)

    if (commandInfo) {
      // Update shared state
      sharedTerminalState.markCommandComplete(
        commandInfo.command,
        result.success,
        result.output,
        result.error
      )

      // Clean up tracking
      this.activeCommands.delete(result.commandId)

      console.log(`📊 Command completed: ${commandInfo.command} (${result.success ? 'SUCCESS' : 'FAILED'}) in ${result.duration}ms`)
    }
  }

  // Handle terminal errors
  private handleTerminalError(error: any): void {
    const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error'

    console.error('🚨 Terminal error:', errorMessage)

    // Add to shared state
    if (sharedTerminalState.getState().lastCommand) {
      sharedTerminalState.addError(sharedTerminalState.getState().lastCommand, errorMessage)
    }

    // Emit error event
    this.emit('error:detected', { message: errorMessage, timestamp: new Date() })

    // Update connection status if needed
    if (errorMessage.includes('connection') || errorMessage.includes('disconnected')) {
      sharedTerminalState.updateState({
        isConnected: false,
        connectionStatus: 'error'
      })
    }
  }

  // Update prompt tracking for better context awareness
  private updatePromptTracking(output: string): void {
    const promptMatch = output.match(/([^@\s]+@[^:]+:[^$#]+[$#])\s*$/)
    if (promptMatch) {
      this.lastPrompt = promptMatch[1]
    }
  }

  // Get recent output for context
  private getRecentOutput(lines = 10): string {
    return this.outputBuffer.slice(-lines).join('')
  }

  // Register agent for output notifications
  registerAgent(agentId: string): void {
    console.log(`🤖 Registering agent: ${agentId}`)

    sharedTerminalState.updateState({
      agentConnected: true,
      agentStatus: 'connected'
    })

    this.emit('agent:connected', agentId)
  }

  // Unregister agent
  unregisterAgent(agentId: string): void {
    console.log(`🤖 Unregistering agent: ${agentId}`)

    sharedTerminalState.updateState({
      agentConnected: false,
      agentStatus: 'disconnected'
    })

    this.emit('agent:disconnected', agentId)
  }

  // Process queued commands
  async processCommandQueue(): Promise<void> {
    const state = sharedTerminalState.getState()

    if (state.isExecuting || state.commandQueue.length === 0) {
      return
    }

    const nextCommand = sharedTerminalState.dequeueCommand()
    if (nextCommand) {
      try {
        await this.executeCommand(nextCommand.command, nextCommand.source)
      } catch (error) {
        console.error(`❌ Queued command failed: ${nextCommand.command}`, error)

        // Retry if attempts remain
        if (nextCommand.retryCount < 3) {
          nextCommand.retryCount++
          const retryId = sharedTerminalState.queueCommand(
            nextCommand.command,
            nextCommand.source,
            nextCommand.priority
          )
          console.log(`🔄 Retrying command (attempt ${nextCommand.retryCount + 1}): ${nextCommand.command}`)
        }
      }
    }
  }

  // Get comprehensive bridge status
  getBridgeStatus(): any {
    const state = sharedTerminalState.getState()

    return {
      initialized: this.isInitialized,
      socketConnected: this.socket?.connected || false,
      activeCommands: this.activeCommands.size,
      queueLength: state.commandQueue.length,
      outputBufferSize: this.outputBuffer.length,
      terminalState: state.connectionStatus,
      agentConnected: state.agentConnected,
      lastActivity: state.recentCommands[0]?.timestamp || null,
      errorCount: state.errors.filter(e => !e.resolved).length
    }
  }

  // Get bridge statistics
  getBridgeStats(): any {
    const state = sharedTerminalState.getState()

    return {
      totalCommands: state.commandCount,
      averageExecutionTime: state.averageCommandTime,
      errorRate: state.errorRate,
      queueThroughput: this.calculateQueueThroughput(),
      syncEfficiency: this.calculateSyncEfficiency(),
      uptime: Date.now() - (this.constructor as any).startTime
    }
  }

  // Calculate queue throughput
  private calculateQueueThroughput(): number {
    const history = sharedTerminalState.getCommandHistory(20)
    if (history.length < 2) return 0

    const timeSpan = history[0].timestamp.getTime() - history[history.length - 1].timestamp.getTime()
    return history.length / (timeSpan / 60000) // Commands per minute
  }

  // Calculate synchronization efficiency
  private calculateSyncEfficiency(): number {
    const state = sharedTerminalState.getState()

    // Base efficiency on error rate and completion rate
    const baseEfficiency = 100 - state.errorRate
    const queueEfficiency = state.commandQueue.length < 5 ? 100 : Math.max(0, 100 - (state.commandQueue.length * 10))

    return Math.round((baseEfficiency + queueEfficiency) / 2)
  }

  // Public methods for external integration

  // Send command from agent with coordination
  async sendAgentCommand(command: string, explanation?: string): Promise<CommandExecutionResult> {
    return await this.executeCommand(command, 'agent', explanation)
  }

  // Send command from terminal user
  async sendUserCommand(command: string): Promise<CommandExecutionResult> {
    return await this.executeCommand(command, 'user')
  }

  // Get current terminal context for agent
  getTerminalContext(): any {
    const state = sharedTerminalState.getState()

    return {
      currentDirectory: state.currentPath,
      currentUser: state.currentUser,
      currentHost: state.currentHost,
      isExecuting: state.isExecuting,
      lastCommand: state.lastCommand,
      lastOutput: state.lastOutput,
      recentCommands: state.recentCommands.slice(-5),
      systemHealth: state.systemHealth,
      permissions: state.permissions,
      queueLength: state.commandQueue.length,
      connectionState: {
        isConnected: state.isConnected,
        isShellReady: state.isShellReady,
        sessionId: state.sessionId
      }
    }
  }

  // Update agent status - ALWAYS AUTONOMOUS
  updateAgentStatus(status: string, mode: 'autonomous' = 'autonomous'): void {
    sharedTerminalState.updateState({
      agentStatus: status,
      autonomousMode: true  // ALWAYS TRUE - No manual mode
    })
  }

  // Clear command queue
  clearQueue(): void {
    sharedTerminalState.updateState({ commandQueue: [] })
  }

  // Get queue status
  getQueueStatus(): { pending: number; executing: number; history: number } {
    const state = sharedTerminalState.getState()

    return {
      pending: state.commandQueue.length,
      executing: this.activeCommands.size,
      history: state.recentCommands.length
    }
  }

  // Emergency stop all commands
  emergencyStop(): void {
    console.log('🛑 Emergency stop - clearing all commands')

    // Clear active commands
    this.activeCommands.clear()

    // Clear queue
    this.clearQueue()

    // Send Ctrl+C if command is executing
    if (this.socket && sharedTerminalState.getState().isExecuting) {
      this.socket.emit('input', '\x03') // Ctrl+C
    }

    // Update state
    sharedTerminalState.updateState({
      isExecuting: false,
      lastCommand: '',
      agentStatus: 'stopped'
    })
  }
}

// Advanced Command Completion Detector
class CommandCompletionDetector {
  private commandPatterns = new Map([
    // System commands
    ['ls', { completion: /^total \d+|^drwx|^-rw/m, timeout: 5000 }],
    ['ps', { completion: /^\s*PID.*COMMAND/m, timeout: 10000 }],
    ['df', { completion: /^Filesystem.*Mounted on/m, timeout: 5000 }],
    ['free', { completion: /^Mem:/m, timeout: 5000 }],
    ['top', { completion: /^top - \d+:\d+:\d+/m, timeout: 2000 }],
    ['htop', { completion: /Tasks:|Load average:/m, timeout: 2000 }],

    // Service commands
    ['systemctl', { completion: /(Active:|Loaded:|Main PID:)/m, timeout: 15000 }],
    ['service', { completion: /(is running|is stopped|start\/running|stop\/waiting)/m, timeout: 10000 }],

    // Package management
    ['apt', { completion: /(Reading package lists|Setting up|Processing triggers)/m, timeout: 60000 }],
    ['yum', { completion: /(Complete!|Nothing to do|Installed:|Updated:)/m, timeout: 60000 }],
    ['dnf', { completion: /(Complete!|Nothing to do|Installed:|Upgraded:)/m, timeout: 60000 }],

    // Network commands
    ['ping', { completion: /^\d+ packets transmitted.*received/m, timeout: 30000 }],
    ['wget', { completion: /(saved|failed|downloaded)/i, timeout: 30000 }],
    ['curl', { completion: /^\s*$|HTTP\/\d\.\d\s+\d+/m, timeout: 30000 }],

    // File operations
    ['cp', { completion: /^$/m, timeout: 30000 }],
    ['mv', { completion: /^$/m, timeout: 30000 }],
    ['mkdir', { completion: /^$/m, timeout: 5000 }],
    ['chmod', { completion: /^$/m, timeout: 5000 }],
    ['chown', { completion: /^$/m, timeout: 5000 }]
  ])

  detectCompletion(output: string, command: string, recentOutput: string): CompletionDetectionResult {
    const baseCommand = command.trim().split(/\s+/)[0]
    const commandPattern = this.commandPatterns.get(baseCommand)

    // Enhanced prompt detection - SUPPORTS BOTH LINUX AND WINDOWS
    const promptPatterns = [
      // Linux prompts
      /([^@\s]+@[^:]+:[^$#]+[$#])\s*$/,
      /^\[[^\]]+\][$#]\s*$/,
      /^[\w-]+:.*[$#]\s*$/,

      // Windows prompts (CMD and PowerShell)
      /^[A-Z]:\\[^>]*>\s*$/m,                    // C:\Users\user>
      /^PS\s+[A-Z]:\\[^>]*>\s*$/m,               // PS C:\Users\user>
      /^[A-Z]:\\[^>]*>\s*$/,                     // Alternative format
      /asus@ASUS\s+[A-Z]:\\[^>]*>\s*$/m          // Windows SSH with username
    ]

    const promptDetected = promptPatterns.some(pattern => pattern.test(output))

    // Error detection - ENHANCED for Windows
    const errorPatterns = [
      // Linux errors
      /command not found/i,
      /permission denied/i,
      /no such file or directory/i,
      /failed|error/i,
      /cannot|unable to/i,

      // Windows errors
      /is not recognized as an internal or external command/i,
      /access is denied/i,
      /cannot find/i,
      /the system cannot find/i,
      /invalid/i
    ]

    const hasError = errorPatterns.some(pattern => pattern.test(output))

    // Command-specific completion
    let hasCommandOutput = false
    if (commandPattern && commandPattern.completion) {
      hasCommandOutput = commandPattern.completion.test(recentOutput)
    }

    // Calculate confidence
    let confidence = 0
    if (promptDetected) confidence += 40
    if (hasCommandOutput) confidence += 30
    if (hasError) confidence += 20
    if (output.includes('\n')) confidence += 10 // Multi-line output usually indicates completion

    // Determine if command is complete
    const isComplete = promptDetected || (hasCommandOutput && !this.isInteractiveCommand(baseCommand))

    return {
      isComplete,
      hasError,
      hasOutput: hasCommandOutput,
      confidence,
      promptDetected,
      errorType: hasError ? this.categorizeError(output) : undefined
    }
  }

  private isInteractiveCommand(command: string): boolean {
    const interactiveCommands = ['top', 'htop', 'less', 'more', 'vi', 'vim', 'nano', 'emacs']
    return interactiveCommands.includes(command)
  }

  private categorizeError(output: string): 'permission' | 'not_found' | 'syntax' | 'network' | 'system' {
    if (/permission denied|access denied|not permitted/i.test(output)) {
      return 'permission'
    }
    if (/not found|no such file|does not exist/i.test(output)) {
      return 'not_found'
    }
    if (/syntax error|invalid syntax|bad command/i.test(output)) {
      return 'syntax'
    }
    if (/network|connection|timeout|unreachable/i.test(output)) {
      return 'network'
    }

    return 'system'
  }
}

// Export singleton instance (class already exported in declaration)
export const agentTerminalBridge = AgentTerminalBridge.getInstance()

// Initialize when imported
try {
  (agentTerminalBridge.constructor as any).startTime = Date.now()
} catch (error) {
  console.log('Bridge initialization deferred')
}
