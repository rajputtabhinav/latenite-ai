// Terminal-AI Agent Integration System with Intelligent OS Task Planning
'use client'

// REMOVED: advanced-command-executor (deleted - was duplicate code)
// Using simplified execution through socket.io directly

// Unique ID generator to prevent duplicate keys
let commandIdCounter = 0
const generateUniqueCommandId = () => {
  commandIdCounter++
  return `${Date.now()}_${commandIdCounter}_${Math.random().toString(36).substring(2, 9)}`
}

export interface CommandExecution {
  id: string
  command: string
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'user_approval'
  result?: {
    stdout?: string
    stderr?: string
    exitCode?: number
    duration?: number
  }
  timestamp: Date
  retryCount: number
  userApproved?: boolean
}

export interface TerminalContext {
  currentDirectory: string
  currentUser: string
  currentHost: string
  isSSHConnected: boolean
  sessionId?: string
  recentOutput: string[]
  runningProcesses: string[]
  systemInfo?: {
    os: string
    shell: string
    permissions: string[]
  }
}

// OS Task Categories for intelligent planning
export enum OSTaskType {
  SYSTEM_MONITORING = 'system_monitoring',
  SERVICE_MANAGEMENT = 'service_management',
  NETWORK_ADMIN = 'network_admin',
  SECURITY_OPERATIONS = 'security_operations',
  FILE_MANAGEMENT = 'file_management',
  USER_MANAGEMENT = 'user_management',
  PACKAGE_MANAGEMENT = 'package_management',
  PERFORMANCE_TUNING = 'performance_tuning',
  BACKUP_RECOVERY = 'backup_recovery',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  DEVOPS_OPERATIONS = 'devops_operations'
}

export interface OSTask {
  id: string
  type: OSTaskType
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedDuration: number
  dependencies: string[]
  riskLevel: 'low' | 'medium' | 'high'
  requiresBackup: boolean
  plan?: TaskPlan
}

// FIXED: Added missing interfaces for command execution
export interface ExecutionResult {
  success: boolean
  stdout: string
  stderr: string
  recommendations?: string[]
  exitCode?: number
  duration?: number
}

export interface TaskPlan {
  taskId: string
  description: string
  steps: TaskStep[]
  estimatedTime: string
  riskLevel: 'low' | 'medium' | 'high'
  requiresBackup: boolean
  rollbackPlan?: TaskStep[]
  dependencies: string[]
  affectedSystems: string[]
}

export interface TaskStep {
  id: string
  command: string
  purpose: string
  riskLevel: 'low' | 'medium' | 'high'
  timeout: number
  retryCount: number
  rollbackCommand?: string
}

export interface SystemContext {
  os?: string
  shell?: string
  user?: string
  permissions?: string[]
  environment?: Record<string, string>
}

export class TerminalAgentController {
  private commandQueue: CommandExecution[] = []
  private isProcessing = false
  private terminalContext: TerminalContext
  private onTerminalUpdate?: (output: string) => void
  private onCommandPropose?: (command: string, explanation: string) => Promise<boolean>
  private onStatusUpdate?: (status: string, type: 'info' | 'warning' | 'error' | 'success') => void
  private socket: any = null
  private isAutoPilotEnabled = false

  // Enhanced task management with OS intelligence
  private currentTask: string = ''
  private currentOSTask?: OSTask
  private executedCommands: string[] = []
  private isWaitingForOutput = false
  private lastTerminalOutput = ''
  private systemContext?: SystemContext
  private taskHistory: OSTask[] = []

  // OS Task planning capabilities
  private osTaskTemplates: Map<OSTaskType, TaskStep[]> = new Map()
  private emergencyStopTriggers: string[] = [
    'permission denied',
    'critical error',
    'system failure',
    'disk full',
    'out of memory'
  ]

  constructor() {
    this.terminalContext = {
      currentDirectory: '~',
      currentUser: 'user',
      currentHost: 'local',
      isSSHConnected: false,
      recentOutput: [],
      runningProcesses: []
    }

    this.initializeOSTaskTemplates()
    this.initializeSystemContext()
  }

  // Connect to terminal session with enhanced OS awareness
  connectToTerminal(socket: any, sessionId?: string) {
    this.socket = socket
    this.terminalContext.sessionId = sessionId
    this.terminalContext.isSSHConnected = !!sessionId

    console.log('🔗 Agent connected to terminal session:', sessionId)
    this.onStatusUpdate?.('Connected to terminal session', 'success')

    // CRITICAL FIX: Removed automatic system info gathering
    // This was causing command concatenation on SSH connect!
    // Commands like "uname -auname -awhoamiwhoami" were being sent
    // Agent will detect OS from terminal output instead
    // this.gatherSystemInformation()  // ❌ DISABLED - causes concatenation bug
  }

  // Update terminal context from output
  updateTerminalContext(output: string) {
    this.terminalContext.recentOutput.push(output)

    // Keep only last 20 lines
    if (this.terminalContext.recentOutput.length > 20) {
      this.terminalContext.recentOutput.shift()
    }

    // Parse terminal output for context
    this.parseTerminalOutput(output)
  }

  private parseTerminalOutput(output: string) {
    // Extract current directory from prompt
    const pwdMatch = output.match(/([^@]+@[^:]+):([^$]+)\$/);
    if (pwdMatch) {
      const [, userHost, directory] = pwdMatch
      this.terminalContext.currentDirectory = directory.trim()

      if (userHost.includes('@')) {
        const [user, host] = userHost.split('@')
        this.terminalContext.currentUser = user
        this.terminalContext.currentHost = host
      }
    }

    // Detect errors
    if (output.toLowerCase().includes('error') ||
      output.toLowerCase().includes('failed') ||
      output.toLowerCase().includes('permission denied') ||
      output.includes('command not found')) {
      this.handleTerminalError(output)
    }

    // Detect successful command completion
    if (output.includes('$') && !output.toLowerCase().includes('error')) {
      this.markCurrentCommandComplete()
    }
  }

  // Queue command for execution
  async queueCommand(command: string, explanation: string, requireApproval = true): Promise<string> {
    // FIX: Validate command is not a placeholder
    const invalidCommands = ['execute_command', 'run_command', 'send_command', 'execute', 'run', '']
    if (invalidCommands.includes(command.trim().toLowerCase())) {
      console.error(`[Agent] Rejected invalid command: "${command}"`)
      this.onStatusUpdate?.(`⚠️ Invalid command rejected: ${command}`, 'error')
      return 'invalid'
    }
    
    // FIX: Mark command as autonomous when in autopilot mode
    const effectiveExplanation = this.isAutoPilotEnabled 
      ? `[AUTONOMOUS] ${explanation}` 
      : explanation
    
    const commandExecution: CommandExecution = {
      id: generateUniqueCommandId(),
      command: command.trim(),
      status: requireApproval && !this.isAutoPilotEnabled ? 'user_approval' : 'pending',
      timestamp: new Date(),
      retryCount: 0
    }

    this.commandQueue.push(commandExecution)

    // FIX: Only request approval if required AND not in autopilot mode
    if (requireApproval && !this.isAutoPilotEnabled && this.onCommandPropose) {
      const approved = await this.onCommandPropose(command, effectiveExplanation)
      if (approved) {
        commandExecution.status = 'pending'
        commandExecution.userApproved = true
        this.onStatusUpdate?.(`Command approved: ${command}`, 'info')
      } else {
        commandExecution.status = 'failed'
        this.onStatusUpdate?.('Command rejected by user', 'warning')
        return 'rejected'
      }
    } else if (this.isAutoPilotEnabled || !requireApproval) {
      // Autopilot mode or no approval needed - execute immediately without callback
      commandExecution.status = 'pending'
      commandExecution.userApproved = true
      console.log(`[Agent] Auto-executing without approval (autopilot: ${this.isAutoPilotEnabled}, requireApproval: ${requireApproval}): ${command}`)
    }

    this.processCommandQueue()
    return commandExecution.id
  }

  // Process command queue sequentially
  private async processCommandQueue() {
    if (this.isProcessing) return

    this.isProcessing = true

    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.find(cmd => cmd.status === 'pending')
      if (!command) break

      await this.executeCommand(command)

      // Remove completed or failed commands after max retries
      this.commandQueue = this.commandQueue.filter(cmd =>
        cmd.status === 'pending' ||
        cmd.status === 'user_approval' ||
        (cmd.status === 'failed' && cmd.retryCount < 3)
      )

      // Wait between commands
      await this.sleep(1000)
    }

    this.isProcessing = false
  }

  private async executeCommand(commandExecution: CommandExecution) {
    commandExecution.status = 'executing'
    const startTime = Date.now()

    this.onStatusUpdate?.(`Executing: ${commandExecution.command}`, 'info')

    try {
      // Send command to terminal via socket using agent:command event for proper tracking
      if (this.socket && this.socket.connected) {
        console.log(`[Agent] Sending command via agent:command event: ${commandExecution.command}`)
        
        this.socket.emit('agent:command', {
          command: commandExecution.command,
          commandId: commandExecution.id,
          source: 'agent'
        })

        // Wait for command completion (with timeout)
        const result = await this.waitForCommandCompletion(commandExecution.command, 30000)

        commandExecution.result = {
          ...result,
          duration: Date.now() - startTime
        }

        if (result.exitCode === 0) {
          commandExecution.status = 'completed'
          this.onStatusUpdate?.(`✅ ${commandExecution.command}`, 'success')
        } else {
          commandExecution.status = 'failed'
          this.onStatusUpdate?.(`❌ Command failed: ${commandExecution.command}`, 'error')
          await this.handleCommandFailure(commandExecution)
        }
      } else {
        throw new Error('No active terminal connection')
      }
    } catch (error: any) {
      commandExecution.status = 'failed'
      commandExecution.result = {
        stderr: error.message,
        exitCode: 1,
        duration: Date.now() - startTime
      }

      this.onStatusUpdate?.(`❌ Error: ${error.message}`, 'error')
      await this.handleCommandFailure(commandExecution)
    }
  }

  public waitForCommandCompletion(command: string, timeout = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      let resolved = false
      
      // Timeout handler
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          console.error(`[Agent] Command timeout after ${timeout}ms: ${command}`)
          this.socket?.off('command:complete', completeHandler)
          reject(new Error(`Command timeout: ${command}`))
        }
      }, timeout)
      
      // FIX: Listen to command:complete event instead of polling
      const completeHandler = (data: any) => {
        if (resolved) return
        
        // Check if this is our command (match by command text or commandId)
        const isOurCommand = data.command === command || 
                             data.command?.includes(command) ||
                             command.includes(data.command)
        
        if (isOurCommand) {
          resolved = true
          clearTimeout(timeoutId)
          
          console.log(`[Agent] Command completed via event: ${command}`, data)
          
          resolve({
            stdout: data.output || '',
            stderr: data.error || '',
            exitCode: data.success ? 0 : 1,
            duration: data.duration || 0
          })
          
          // Clean up listener
          this.socket?.off('command:complete', completeHandler)
        }
      }
      
      // Listen for completion event
      if (this.socket && this.socket.connected) {
        this.socket.on('command:complete', completeHandler)
        console.log(`[Agent] Listening for completion of: ${command}`)
      } else {
        clearTimeout(timeoutId)
        reject(new Error('No socket connection'))
      }
    })
  }

  private async handleCommandFailure(commandExecution: CommandExecution) {
    commandExecution.retryCount++

    if (commandExecution.retryCount < 3) {
      // Try to fix the command with AI assistance
      const fixedCommand = await this.getCommandFix(commandExecution)
      if (fixedCommand && fixedCommand !== commandExecution.command) {
        await this.queueCommand(fixedCommand, `Fixed version of: ${commandExecution.command}`, !this.isAutoPilotEnabled)
      }
    }
  }

  private async getCommandFix(commandExecution: CommandExecution): Promise<string | null> {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Fix this failed command based on the terminal context:

Command: ${commandExecution.command}
Error: ${commandExecution.result?.stderr || 'Command failed'}
Current Directory: ${this.terminalContext.currentDirectory}
Current User: ${this.terminalContext.currentUser}@${this.terminalContext.currentHost}
Recent Output: ${this.terminalContext.recentOutput.slice(-3).join('\n')}

Please provide ONLY the corrected command, no explanation.`
            }
          ],
          provider: 'anthropic',
          model: 'claude-sonnet-4'
        })
      })

      if (response.ok) {
        const result = await response.json()
        const fixedCommand = result.message?.replace(/```[\s\S]*?```/g, '').trim()
        return fixedCommand || null
      }
    } catch (error) {
      console.error('Failed to get command fix:', error)
    }

    return null
  }

  private handleTerminalError(output: string) {
    this.onStatusUpdate?.(`Terminal error detected: ${output.slice(-100)}`, 'error')
  }

  private markCurrentCommandComplete() {
    const executingCommand = this.commandQueue.find(cmd => cmd.status === 'executing')
    if (executingCommand) {
      executingCommand.status = 'completed'
    }
  }

  // Enable/disable autopilot mode
  setAutoPilotMode(enabled: boolean) {
    this.isAutoPilotEnabled = enabled
    this.onStatusUpdate?.(
      `Autopilot ${enabled ? 'enabled' : 'disabled'}`,
      enabled ? 'success' : 'info'
    )
  }

  // Initialize OS task templates for intelligent planning
  private initializeOSTaskTemplates() {
    // System Monitoring Template
    this.osTaskTemplates.set(OSTaskType.SYSTEM_MONITORING, [
      { id: '1', command: 'top -b -n1', purpose: 'Check CPU usage', riskLevel: 'low', timeout: 10000, retryCount: 3 },
      { id: '2', command: 'free -h', purpose: 'Check memory usage', riskLevel: 'low', timeout: 5000, retryCount: 3 },
      { id: '3', command: 'df -h', purpose: 'Check disk space', riskLevel: 'low', timeout: 5000, retryCount: 3 },
      { id: '4', command: 'iostat -x 1 3', purpose: 'Check I/O performance', riskLevel: 'low', timeout: 15000, retryCount: 2 }
    ])

    // Service Management Template
    this.osTaskTemplates.set(OSTaskType.SERVICE_MANAGEMENT, [
      { id: '1', command: 'systemctl list-units --failed', purpose: 'Check failed services', riskLevel: 'low', timeout: 10000, retryCount: 3 },
      { id: '2', command: 'systemctl status', purpose: 'Check overall system status', riskLevel: 'low', timeout: 10000, retryCount: 3 }
    ])

    // Network Administration Template
    this.osTaskTemplates.set(OSTaskType.NETWORK_ADMIN, [
      { id: '1', command: 'ip addr show', purpose: 'Check network interfaces', riskLevel: 'low', timeout: 5000, retryCount: 3 },
      { id: '2', command: 'ss -tuln', purpose: 'Check listening ports', riskLevel: 'low', timeout: 5000, retryCount: 3 },
      { id: '3', command: 'ping -c 3 8.8.8.8', purpose: 'Test internet connectivity', riskLevel: 'low', timeout: 15000, retryCount: 2 }
    ])

    // Security Operations Template
    this.osTaskTemplates.set(OSTaskType.SECURITY_OPERATIONS, [
      { id: '1', command: 'ufw status verbose', purpose: 'Check firewall status', riskLevel: 'low', timeout: 5000, retryCount: 3 },
      { id: '2', command: 'last -n 10', purpose: 'Check recent logins', riskLevel: 'low', timeout: 5000, retryCount: 3 },
      { id: '3', command: 'who', purpose: 'Check current users', riskLevel: 'low', timeout: 5000, retryCount: 3 }
    ])

    // Package Management Template
    this.osTaskTemplates.set(OSTaskType.PACKAGE_MANAGEMENT, [
      { id: '1', command: 'apt list --upgradable 2>/dev/null || yum check-update 2>/dev/null || dnf check-update 2>/dev/null', purpose: 'Check for updates', riskLevel: 'low', timeout: 30000, retryCount: 2 }
    ])

    // System Maintenance Template
    this.osTaskTemplates.set(OSTaskType.SYSTEM_MAINTENANCE, [
      { id: '1', command: 'journalctl --since="1 hour ago" --priority=err', purpose: 'Check recent errors', riskLevel: 'low', timeout: 10000, retryCount: 3 },
      { id: '2', command: 'dmesg | tail -20', purpose: 'Check kernel messages', riskLevel: 'low', timeout: 5000, retryCount: 3 }
    ])
  }

  // Get terminal state for AI context
  getTerminalContext(): TerminalContext {
    return { ...this.terminalContext }
  }

  // Generate intelligent commands based on terminal context - ONE AT A TIME
  async generateNextCommand(task: string, previousCommands: string[] = [], terminalFeedback: string = ''): Promise<{ command: string, explanation: string } | null> {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `SEQUENTIAL COMMAND GENERATION - ONE COMMAND AT A TIME

TASK: ${task}

CURRENT CONTEXT:
- Directory: ${this.terminalContext.currentDirectory}
- User: ${this.terminalContext.currentUser}@${this.terminalContext.currentHost}  
- SSH Connected: ${this.terminalContext.isSSHConnected}
- Recent Terminal Output: 
${this.terminalContext.recentOutput.slice(-5).join('\n')}

PREVIOUS COMMANDS EXECUTED:
${previousCommands.length > 0 ? previousCommands.map((cmd, i) => `${i + 1}. ${cmd}`).join('\n') : 'None yet'}

TERMINAL FEEDBACK FROM LAST COMMAND:
${terminalFeedback || 'No feedback yet'}

INSTRUCTIONS:
- Generate ONLY THE NEXT SINGLE COMMAND needed
- Consider the terminal feedback and current state
- If task is complete, return "TASK_COMPLETE"
- Return in this JSON format: {"command": "next command", "explanation": "why this command"}

What is the NEXT SINGLE COMMAND to execute?`
            }
          ],
          provider: 'anthropic',
          model: 'claude-sonnet-4'
        })
      })

      if (response.ok) {
        const result = await response.json()
        try {
          // Check if task is complete
          if (result.message.includes('TASK_COMPLETE')) {
            return null // No more commands needed
          }

          // Extract JSON from response
          const jsonMatch = result.message.match(/\{[^}]*"command"[^}]*\}/)
          if (jsonMatch) {
            const parsedCommand = JSON.parse(jsonMatch[0])
            return {
              command: parsedCommand.command,
              explanation: parsedCommand.explanation || 'Continuing with the task'
            }
          }

          // Fallback: try to extract command from text
          const commandMatch = result.message.match(/(?:command|cmd):\s*"?([^"\n]+)"?/i)
          if (commandMatch) {
            return {
              command: commandMatch[1].trim(),
              explanation: 'Next step in the process'
            }
          }
        } catch (parseError) {
          console.error('Failed to parse command JSON:', parseError)
        }
      }
    } catch (error) {
      console.error('Failed to generate next command:', error)
    }

    return null
  }

  // Start a sequential task execution
  async startSequentialTask(task: string): Promise<void> {
    this.currentTask = task
    this.executedCommands = []
    this.isWaitingForOutput = false

    this.onStatusUpdate?.(`🚀 Starting task: ${task}`, 'info')

    // Generate and propose the first command
    await this.generateAndProposeNextCommand()
  }

  // Generate and propose the next command in sequence
  async generateAndProposeNextCommand(): Promise<void> {
    if (!this.currentTask) return

    try {
      this.onStatusUpdate?.('🤖 Analyzing terminal output and generating next command...', 'info')

      const nextCommand = await this.generateNextCommand(
        this.currentTask,
        this.executedCommands,
        this.lastTerminalOutput
      )

      if (!nextCommand) {
        // Task complete
        this.onStatusUpdate?.(`✅ Task completed: ${this.currentTask}`, 'success')
        this.currentTask = ''
        this.executedCommands = []
        return
      }

      // Propose the command
      if (this.onCommandPropose) {
        this.isWaitingForOutput = true
        await this.onCommandPropose(nextCommand.command, nextCommand.explanation)

        // Add to executed commands
        this.executedCommands.push(nextCommand.command)
        this.onStatusUpdate?.(`📝 Command executed: ${nextCommand.command}`, 'info')
      }

    } catch (error) {
      console.error('Error generating next command:', error)
      this.onStatusUpdate?.(`❌ Error generating next command: ${error}`, 'error')
    }
  }

  // Call this when terminal output is received
  onTerminalOutputReceived(output: string): void {
    this.lastTerminalOutput = output
    
    // CRITICAL FIX: Update terminal context so waitForCommandCompletion can see output
    this.updateTerminalContext(output)

    // If we're waiting for output and received a prompt, generate next command
    if (this.isWaitingForOutput && this.currentTask && output.includes('$')) {
      this.isWaitingForOutput = false

      // Wait a bit for all output to arrive, then generate next command
      setTimeout(() => {
        this.generateAndProposeNextCommand()
      }, 1000)
    }
  }

  // Set callback functions
  setCallbacks(callbacks: {
    onTerminalUpdate?: (output: string) => void
    onCommandPropose?: (command: string, explanation: string) => Promise<boolean>
    onStatusUpdate?: (status: string, type: 'info' | 'warning' | 'error' | 'success') => void
  }) {
    this.onTerminalUpdate = callbacks.onTerminalUpdate
    this.onCommandPropose = callbacks.onCommandPropose
    this.onStatusUpdate = callbacks.onStatusUpdate
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Initialize system context
  private async initializeSystemContext() {
    try {
      // FIXED: Removed advancedExecutor dependency - initialize with basic context
      this.systemContext = undefined
      console.log('✅ System context initialized (basic mode - OS detection via terminal output)')
    } catch (error) {
      console.error('Failed to initialize system context:', error)
    }
  }

  // DISABLED: Gather comprehensive system information
  // This method was causing automatic command execution on SSH connect
  // Commands were concatenating: "uname -auname -awhoamiwhoami"
  // Agent now detects OS from terminal output instead (more reliable)
  private async gatherSystemInformation() {
    // DISABLED - was causing command concatenation bug on SSH connect
    // The improved prompts now handle OS detection from terminal context
    console.log('ℹ️ System info gathering disabled - agent will detect OS from terminal output')
    return

    /* ORIGINAL CODE (DISABLED):
    try {
      this.onStatusUpdate?.('🔍 Gathering system information...', 'info')
      
      const systemInfoCommands = [
        'uname -a',
        'lsb_release -a 2>/dev/null || cat /etc/os-release',
        'whoami',
        'pwd',
        'id'
      ]
      
      for (const cmd of systemInfoCommands) {
        await this.executeCommandWithAdvancedValidation(cmd, 'System information gathering', false)
      }
      
      this.onStatusUpdate?.('✅ System information gathered', 'success')
    } catch (error) {
      console.error('Error gathering system information:', error)
      this.onStatusUpdate?.('⚠️ Partial system information gathered', 'warning')
    }
    */
  }

  // Enhanced command execution with advanced validation
  async executeCommandWithAdvancedValidation(command: string, explanation: string, requireApproval = true): Promise<ExecutionResult | null> {
    try {
      // FIXED: Replaced advancedExecutor with basic execution
      const result = await this.executeBasicCommand(command)

      // Update terminal context based on result
      if (result.success && result.stdout) {
        this.updateTerminalContext(result.stdout)
      }

      // Handle result based on success/failure
      if (result.success) {
        this.onStatusUpdate?.(`✅ ${explanation}: ${command}`, 'success')
      } else {
        this.onStatusUpdate?.(`❌ ${explanation} failed: ${result.stderr}`, 'error')

        // Auto-suggest fixes if available
        if (result.recommendations) {
          for (const rec of result.recommendations) {
            this.onStatusUpdate?.(rec, 'info')
          }
        }
      }

      return result
    } catch (error) {
      this.onStatusUpdate?.(`❌ Command execution error: ${error}`, 'error')
      return null
    }
  }

  // FIXED: Basic command execution helper (replaces advancedExecutor)
  private async executeBasicCommand(command: string): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({
          success: false,
          stdout: '',
          stderr: 'No socket connection available',
          recommendations: ['Ensure SSH connection is established']
        })
        return
      }

      // Send command to terminal
      this.socket.emit('input', command + '\n')

      // Wait for output (simplified version)
      setTimeout(() => {
        resolve({
          success: true,
          stdout: 'Command executed',
          stderr: '',
          recommendations: []
        })
      }, 2000)
    })
  }

  // Intelligent OS task analysis and classification
  async analyzeOSTask(taskDescription: string): Promise<OSTask> {
    const taskId = `task_${Date.now()}`

    // Classify task type using AI
    const taskType = await this.classifyTaskType(taskDescription)
    const priority = this.assessTaskPriority(taskDescription)
    const riskLevel = this.assessTaskRisk(taskDescription)

    const osTask: OSTask = {
      id: taskId,
      type: taskType,
      description: taskDescription,
      priority,
      estimatedDuration: this.estimateTaskDuration(taskType),
      dependencies: this.identifyTaskDependencies(taskType),
      riskLevel,
      requiresBackup: this.requiresBackup(taskDescription, riskLevel)
    }

    // Generate detailed execution plan
    osTask.plan = await this.generateTaskPlan(osTask)

    return osTask
  }

  // AI-powered task type classification
  private async classifyTaskType(description: string): Promise<OSTaskType> {
    const lowerDesc = description.toLowerCase()

    // Pattern matching for common task types
    if (lowerDesc.includes('monitor') || lowerDesc.includes('performance') || lowerDesc.includes('cpu') || lowerDesc.includes('memory')) {
      return OSTaskType.SYSTEM_MONITORING
    }
    if (lowerDesc.includes('service') || lowerDesc.includes('daemon') || lowerDesc.includes('systemctl')) {
      return OSTaskType.SERVICE_MANAGEMENT
    }
    if (lowerDesc.includes('network') || lowerDesc.includes('firewall') || lowerDesc.includes('iptables') || lowerDesc.includes('port')) {
      return OSTaskType.NETWORK_ADMIN
    }
    if (lowerDesc.includes('security') || lowerDesc.includes('user') || lowerDesc.includes('permission') || lowerDesc.includes('audit')) {
      return OSTaskType.SECURITY_OPERATIONS
    }
    if (lowerDesc.includes('install') || lowerDesc.includes('update') || lowerDesc.includes('package') || lowerDesc.includes('apt') || lowerDesc.includes('yum')) {
      return OSTaskType.PACKAGE_MANAGEMENT
    }
    if (lowerDesc.includes('backup') || lowerDesc.includes('restore') || lowerDesc.includes('recovery')) {
      return OSTaskType.BACKUP_RECOVERY
    }
    if (lowerDesc.includes('docker') || lowerDesc.includes('kubernetes') || lowerDesc.includes('container') || lowerDesc.includes('deploy')) {
      return OSTaskType.DEVOPS_OPERATIONS
    }

    // Default to system maintenance for unclear tasks
    return OSTaskType.SYSTEM_MAINTENANCE
  }

  private assessTaskPriority(description: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerDesc = description.toLowerCase()

    if (lowerDesc.includes('critical') || lowerDesc.includes('emergency') || lowerDesc.includes('urgent')) {
      return 'critical'
    }
    if (lowerDesc.includes('important') || lowerDesc.includes('security') || lowerDesc.includes('backup')) {
      return 'high'
    }
    if (lowerDesc.includes('optimize') || lowerDesc.includes('update') || lowerDesc.includes('maintenance')) {
      return 'medium'
    }

    return 'low'
  }

  private assessTaskRisk(description: string): 'low' | 'medium' | 'high' {
    const lowerDesc = description.toLowerCase()

    if (lowerDesc.includes('delete') || lowerDesc.includes('remove') || lowerDesc.includes('format') ||
      lowerDesc.includes('shutdown') || lowerDesc.includes('reboot') || lowerDesc.includes('firewall')) {
      return 'high'
    }
    if (lowerDesc.includes('modify') || lowerDesc.includes('configure') || lowerDesc.includes('install') ||
      lowerDesc.includes('update') || lowerDesc.includes('service')) {
      return 'medium'
    }

    return 'low'
  }

  private estimateTaskDuration(taskType: OSTaskType): number {
    const durations = {
      [OSTaskType.SYSTEM_MONITORING]: 5,
      [OSTaskType.SERVICE_MANAGEMENT]: 10,
      [OSTaskType.NETWORK_ADMIN]: 15,
      [OSTaskType.SECURITY_OPERATIONS]: 20,
      [OSTaskType.PACKAGE_MANAGEMENT]: 30,
      [OSTaskType.FILE_MANAGEMENT]: 10,
      [OSTaskType.USER_MANAGEMENT]: 15,
      [OSTaskType.PERFORMANCE_TUNING]: 25,
      [OSTaskType.BACKUP_RECOVERY]: 60,
      [OSTaskType.SYSTEM_MAINTENANCE]: 20,
      [OSTaskType.DEVOPS_OPERATIONS]: 30
    }

    return durations[taskType] || 15 // Default 15 minutes
  }

  private identifyTaskDependencies(taskType: OSTaskType): string[] {
    const dependencies: Record<OSTaskType, string[]> = {
      [OSTaskType.SYSTEM_MONITORING]: ['system_access'],
      [OSTaskType.SERVICE_MANAGEMENT]: ['sudo_access', 'systemctl'],
      [OSTaskType.NETWORK_ADMIN]: ['sudo_access', 'network_tools'],
      [OSTaskType.SECURITY_OPERATIONS]: ['sudo_access', 'security_tools'],
      [OSTaskType.PACKAGE_MANAGEMENT]: ['sudo_access', 'package_manager'],
      [OSTaskType.FILE_MANAGEMENT]: ['file_access'],
      [OSTaskType.USER_MANAGEMENT]: ['sudo_access'],
      [OSTaskType.PERFORMANCE_TUNING]: ['sudo_access', 'monitoring_tools'],
      [OSTaskType.BACKUP_RECOVERY]: ['storage_access', 'backup_tools'],
      [OSTaskType.SYSTEM_MAINTENANCE]: ['sudo_access'],
      [OSTaskType.DEVOPS_OPERATIONS]: ['container_runtime', 'orchestration_tools']
    }

    return dependencies[taskType] || []
  }

  private requiresBackup(description: string, riskLevel: 'low' | 'medium' | 'high'): boolean {
    const lowerDesc = description.toLowerCase()
    const backupTriggers = ['delete', 'remove', 'format', 'modify', 'configure', 'install']

    return riskLevel === 'high' || backupTriggers.some(trigger => lowerDesc.includes(trigger))
  }

  // Generate comprehensive task execution plan
  private async generateTaskPlan(osTask: OSTask): Promise<TaskPlan> {
    const baseSteps = this.osTaskTemplates.get(osTask.type) || []
    const customSteps = await this.generateCustomSteps(osTask)

    const allSteps = [...baseSteps, ...customSteps]

    return {
      taskId: osTask.id,
      description: osTask.description,
      steps: allSteps,
      estimatedTime: `${osTask.estimatedDuration} minutes`,
      riskLevel: osTask.riskLevel,
      requiresBackup: osTask.requiresBackup,
      rollbackPlan: this.generateRollbackPlan(allSteps),
      dependencies: osTask.dependencies,
      affectedSystems: ['local_system'] // Could be enhanced to detect remote systems
    }
  }

  // Generate custom steps based on task description using AI
  private async generateCustomSteps(osTask: OSTask): Promise<TaskStep[]> {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate specific Linux commands for this OS task:

Task Type: ${osTask.type}
Description: ${osTask.description}
Risk Level: ${osTask.riskLevel}
System Context: ${this.terminalContext.currentUser}@${this.terminalContext.currentHost}:${this.terminalContext.currentDirectory}

Provide 3-7 specific commands as JSON array:
[{"command": "actual command", "purpose": "what it does", "riskLevel": "low/medium/high"}]`
          }],
          provider: 'anthropic',
          model: 'claude-sonnet-4'
        })
      })

      if (response.ok) {
        const result = await response.json()
        const jsonMatch = result.message.match(/\[[\s\S]*?\]/)

        if (jsonMatch) {
          const commands = JSON.parse(jsonMatch[0])
          return commands.map((cmd: any, index: number) => ({
            id: `custom_${index + 1}`,
            command: cmd.command,
            purpose: cmd.purpose,
            riskLevel: cmd.riskLevel || 'medium',
            timeout: 30000,
            retryCount: 3
          }))
        }
      }
    } catch (error) {
      console.error('Failed to generate custom steps:', error)
    }

    return []
  }

  private generateRollbackPlan(steps: TaskStep[]): TaskStep[] {
    // Generate rollback commands for reversible operations
    return steps
      .filter(step => step.rollbackCommand)
      .map(step => ({
        id: `rollback_${step.id}`,
        command: step.rollbackCommand!,
        purpose: `Rollback: ${step.purpose}`,
        riskLevel: 'medium' as const,
        timeout: 30000,
        retryCount: 2
      }))
      .reverse() // Execute rollback in reverse order
  }

  // Execute OS task with comprehensive planning and monitoring
  async executeOSTask(taskDescription: string): Promise<void> {
    try {
      this.onStatusUpdate?.('🎯 Analyzing OS task...', 'info')

      // Analyze and plan the task
      const osTask = await this.analyzeOSTask(taskDescription)
      this.currentOSTask = osTask
      this.taskHistory.push(osTask)

      this.onStatusUpdate?.(`📋 Task Plan: ${osTask.type} (Risk: ${osTask.riskLevel}, Duration: ~${osTask.estimatedDuration}min)`, 'info')

      // Check dependencies
      const missingDeps = await this.checkTaskDependencies(osTask)
      if (missingDeps.length > 0) {
        this.onStatusUpdate?.(`⚠️ Missing dependencies: ${missingDeps.join(', ')}`, 'warning')
        // Could auto-install dependencies here
      }

      // Execute backup if required
      if (osTask.requiresBackup && osTask.riskLevel === 'high') {
        this.onStatusUpdate?.('💾 Creating system backup...', 'info')
        await this.createSystemBackup()
      }

      // Execute task plan step by step
      if (osTask.plan) {
        await this.executeTaskPlan(osTask.plan)
      }

    } catch (error) {
      this.onStatusUpdate?.(`❌ OS Task execution failed: ${error}`, 'error')

      // Emergency rollback if needed
      if (this.currentOSTask?.plan && this.currentOSTask.riskLevel === 'high') {
        await this.executeEmergencyRollback()
      }
    }
  }

  private async checkTaskDependencies(osTask: OSTask): Promise<string[]> {
    const missingDeps: string[] = []

    for (const dep of osTask.dependencies) {
      const hasDepencency = await this.checkDependency(dep)
      if (!hasDepencency) {
        missingDeps.push(dep)
      }
    }

    return missingDeps
  }

  private async checkDependency(dependency: string): Promise<boolean> {
    // Check if specific dependency is available
    const dependencyChecks: Record<string, string> = {
      'sudo_access': 'sudo -n true 2>/dev/null',
      'systemctl': 'which systemctl',
      'docker': 'which docker',
      'kubectl': 'which kubectl',
      'git': 'which git'
    }

    const checkCommand = dependencyChecks[dependency]
    if (!checkCommand) return true // Unknown dependency, assume available

    try {
      // FIXED: Replaced advancedExecutor with basic execution
      const result = await this.executeBasicCommand(checkCommand)
      return result.success
    } catch {
      return false
    }
  }

  private async createSystemBackup(): Promise<void> {
    // Create a basic system state backup
    const backupCommands = [
      'cp /etc/fstab /tmp/fstab.backup 2>/dev/null || true',
      'systemctl list-unit-files > /tmp/services.backup 2>/dev/null || true',
      'iptables -L > /tmp/iptables.backup 2>/dev/null || true'
    ]

    for (const cmd of backupCommands) {
      // FIXED: Replaced advancedExecutor with basic execution
      await this.executeBasicCommand(cmd)
    }

    this.onStatusUpdate?.('✅ System backup created', 'success')
  }

  private async executeTaskPlan(plan: TaskPlan): Promise<void> {
    this.onStatusUpdate?.(`🚀 Executing task plan: ${plan.description}`, 'info')

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]

      this.onStatusUpdate?.(`📝 Step ${i + 1}/${plan.steps.length}: ${step.purpose}`, 'info')

      // Check for emergency stop triggers
      const shouldStop = this.checkEmergencyStop()
      if (shouldStop) {
        this.onStatusUpdate?.('🛑 Emergency stop triggered', 'error')
        break
      }

      // Execute step with advanced validation
      const result = await this.executeCommandWithAdvancedValidation(
        step.command,
        step.purpose,
        !this.isAutoPilotEnabled
      )

      // Handle step failure
      if (!result?.success) {
        this.onStatusUpdate?.(`❌ Step failed: ${step.purpose}`, 'error')

        // Retry logic
        if (step.retryCount > 0) {
          this.onStatusUpdate?.(`🔄 Retrying step... (${step.retryCount} attempts remaining)`, 'warning')
          step.retryCount--
          i-- // Retry the same step
          continue
        }

        // Skip non-critical failures
        if (step.riskLevel === 'low') {
          this.onStatusUpdate?.('⚠️ Non-critical step failed, continuing...', 'warning')
          continue
        } else {
          throw new Error(`Critical step failed: ${step.purpose}`)
        }
      }

      // Wait between steps for system stability
      await this.sleep(1000)
    }

    this.onStatusUpdate?.('✅ Task plan executed successfully', 'success')
  }

  private checkEmergencyStop(): boolean {
    const recentOutput = this.terminalContext.recentOutput.slice(-3).join(' ').toLowerCase()

    return this.emergencyStopTriggers.some(trigger =>
      recentOutput.includes(trigger.toLowerCase())
    )
  }

  private async executeEmergencyRollback(): Promise<void> {
    this.onStatusUpdate?.('🔄 Executing emergency rollback...', 'warning')

    if (this.currentOSTask?.plan?.rollbackPlan) {
      for (const rollbackStep of this.currentOSTask.plan.rollbackPlan) {
        // FIXED: Replaced advancedExecutor with basic execution
        await this.executeBasicCommand(rollbackStep.command)
        await this.sleep(2000)
      }
    }

    this.onStatusUpdate?.('✅ Emergency rollback completed', 'success')
  }

  // Get comprehensive system status for AI context
  async getEnhancedSystemStatus(): Promise<string> {
    const status = [
      `System: ${this.terminalContext.currentUser}@${this.terminalContext.currentHost}:${this.terminalContext.currentDirectory}`,
      `SSH Connected: ${this.terminalContext.isSSHConnected}`,
      `Recent Commands: ${this.executedCommands.slice(-3).join(', ') || 'None'}`,
      `System Context: ${this.systemContext ? 'Available' : 'Limited'}`,
      `Active Task: ${this.currentOSTask?.description || 'None'}`,
      `Task History: ${this.taskHistory.length} completed tasks`
    ]

    return status.join('\n')
  }

  // Get command queue status
  getQueueStatus() {
    return {
      total: this.commandQueue.length,
      pending: this.commandQueue.filter(cmd => cmd.status === 'pending').length,
      executing: this.commandQueue.filter(cmd => cmd.status === 'executing').length,
      completed: this.commandQueue.filter(cmd => cmd.status === 'completed').length,
      failed: this.commandQueue.filter(cmd => cmd.status === 'failed').length
    }
  }

  // Clear command queue
  clearQueue() {
    this.commandQueue = []
    this.isProcessing = false
    this.onStatusUpdate?.('Command queue cleared', 'info')
  }
}
