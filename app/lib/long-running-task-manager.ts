import { EventEmitter } from 'events'
import { logger } from './utils/logger'

export enum TaskType {
  STREAMING = 'streaming',      // top, htop, watch, tail -f
  BACKGROUND = 'background',     // npm install, git clone
  LONG_RUNNING = 'long_running', // database migration, compilation
  MULTI_DAY = 'multi_day'        // benchmarking, certifications
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  MONITORING = 'monitoring',     // For streaming tasks
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface LongRunningTask {
  id: string
  type: TaskType
  status: TaskStatus
  command: string
  description: string
  startTime: number
  lastUpdateTime: number
  endTime?: number
  
  // Progress tracking
  currentStep?: number
  totalSteps?: number
  progress?: number  // 0-100
  
  // Output tracking
  output: string[]
  errors: string[]
  latestOutput?: string
  
  // Timeouts
  maxDuration?: number  // null = no limit
  checkInterval: number  // How often to check status
  
  // Persistence
  sessionId?: string
  persistAcrossSessions: boolean
  
  // Checkpointing (for resumable tasks)
  checkpoints: TaskCheckpoint[]
  canResume: boolean
  
  // Metadata
  metadata: Record<string, any>
}

export interface TaskCheckpoint {
  id: string
  timestamp: number
  step: string
  output: string
  canRollback: boolean
}

export class LongRunningTaskManager extends EventEmitter {
  private static instance: LongRunningTaskManager
  private tasks: Map<string, LongRunningTask> = new Map()
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map()
  
  private constructor() {
    super()
    this.loadPersistedTasks()
  }
  
  static getInstance(): LongRunningTaskManager {
    if (!this.instance) {
      this.instance = new LongRunningTaskManager()
    }
    return this.instance
  }
  
  /**
   * Create a new long-running task
   */
  createTask(config: {
    command: string
    description: string
    type: TaskType
    maxDuration?: number
    checkInterval?: number
    persistAcrossSessions?: boolean
    metadata?: Record<string, any>
  }): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const task: LongRunningTask = {
      id: taskId,
      type: config.type,
      status: TaskStatus.PENDING,
      command: config.command,
      description: config.description,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      output: [],
      errors: [],
      checkInterval: config.checkInterval || this.getDefaultCheckInterval(config.type),
      maxDuration: config.maxDuration,
      persistAcrossSessions: config.persistAcrossSessions ?? true,
      checkpoints: [],
      canResume: this.isResumableCommand(config.command),
      metadata: config.metadata || {}
    }
    
    this.tasks.set(taskId, task)
    this.persistTask(task)
    
    logger.info(`📋 Created ${config.type} task: ${taskId} - ${config.description}`)
    this.emit('task:created', task)
    
    return taskId
  }
  
  /**
   * Start a task with appropriate monitoring
   */
  async startTask(taskId: string, sshSocket?: any): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)
    
    task.status = TaskStatus.RUNNING
    task.startTime = Date.now()
    this.persistTask(task)
    
    logger.info(`▶️ Starting task: ${taskId} (${task.type})`)
    this.emit('task:started', task)
    
    switch (task.type) {
      case TaskType.STREAMING:
        await this.startStreamingTask(task, sshSocket)
        break
      case TaskType.BACKGROUND:
        await this.startBackgroundTask(task, sshSocket)
        break
      case TaskType.LONG_RUNNING:
        await this.startLongRunningTask(task, sshSocket)
        break
      case TaskType.MULTI_DAY:
        await this.startMultiDayTask(task, sshSocket)
        break
    }
  }
  
  /**
   * STREAMING TASKS - Continuous monitoring (top, htop, watch, tail -f)
   */
  private async startStreamingTask(task: LongRunningTask, sshSocket: any): Promise<void> {
    task.status = TaskStatus.MONITORING
    
    // Send command to terminal
    if (sshSocket) {
      sshSocket.emit('agent:command', {
        command: task.command,
        commandId: task.id,
        source: 'agent-streaming'
      })
    }
    
    // Set up continuous output monitoring
    const monitorInterval = setInterval(() => {
      this.checkTaskHealth(task.id)
      
      // Emit status update for AI agent
      this.emit('task:update', {
        taskId: task.id,
        latestOutput: task.latestOutput,
        outputLines: task.output.slice(-10), // Last 10 lines
        status: task.status,
        duration: Date.now() - task.startTime
      })
    }, task.checkInterval)
    
    this.monitoringIntervals.set(task.id, monitorInterval)
    
    logger.terminal.output(`👁️ Monitoring streaming task: ${task.command}`)
  }
  
  /**
   * BACKGROUND TASKS - Run to completion with periodic updates
   */
  private async startBackgroundTask(task: LongRunningTask, sshSocket: any): Promise<void> {
    // Start command
    if (sshSocket) {
      sshSocket.emit('agent:command', {
        command: task.command,
        commandId: task.id,
        source: 'agent-background'
      })
    }
    
    // Monitor with longer intervals
    const monitorInterval = setInterval(() => {
      // Check if command is still running
      this.checkTaskHealth(task.id)
      
      // Emit progress update
      const progress = this.estimateProgress(task)
      this.emit('task:progress', {
        taskId: task.id,
        progress,
        latestOutput: task.latestOutput
      })
    }, task.checkInterval)
    
    this.monitoringIntervals.set(task.id, monitorInterval)
  }
  
  /**
   * LONG-RUNNING TASKS - Hours to days with checkpointing
   */
  private async startLongRunningTask(task: LongRunningTask, sshSocket: any): Promise<void> {
    // Create checkpoint before starting
    this.createCheckpoint(task, 'Task started')
    
    // Start command with nohup for persistence
    const persistentCommand = this.wrapCommandForPersistence(task.command, task.id)
    
    if (sshSocket) {
      sshSocket.emit('agent:command', {
        command: persistentCommand,
        commandId: task.id,
        source: 'agent-longrunning'
      })
    }
    
    // Monitor with adaptive intervals
    let checkInterval = task.checkInterval
    const taskId = task.id
    const monitorInterval = setInterval(async () => {
      const taskInstance = this.tasks.get(taskId)
      if (!taskInstance) return
      
      // Still running - create periodic checkpoint
      if (Date.now() - taskInstance.lastUpdateTime > 3600000) { // Every hour
        this.createCheckpoint(taskInstance, 'Hourly checkpoint')
      }
      
      // Adaptive interval: slower checks as time goes on
      checkInterval = Math.min(checkInterval * 1.1, 60000) // Max 60s
    }, checkInterval)
    
    this.monitoringIntervals.set(task.id, monitorInterval)
  }
  
  /**
   * MULTI-DAY TASKS - Days to months with full orchestration
   */
  private async startMultiDayTask(task: LongRunningTask, sshSocket: any): Promise<void> {
    // For multi-day tasks, we need:
    // 1. Detached process (screen/tmux)
    // 2. Log file for output
    // 3. PID tracking
    // 4. Heartbeat monitoring
    
    const logFile = `/tmp/latenite_task_${task.id}.log`
    const pidFile = `/tmp/latenite_task_${task.id}.pid`
    
    // Wrap command with screen + logging
    const wrappedCommand = `screen -dmS ${task.id} bash -c 'echo $$ > ${pidFile}; ${task.command} 2>&1 | tee ${logFile}; echo "EXIT_CODE=$?" >> ${logFile}'`
    
    if (sshSocket) {
      sshSocket.emit('agent:command', {
        command: wrappedCommand,
        commandId: task.id,
        source: 'agent-multiday'
      })
    }
    
    // Monitor with very slow intervals
    const multiDayTaskId = task.id
    const monitorInterval = setInterval(async () => {
      const taskInstance = this.tasks.get(multiDayTaskId)
      if (!taskInstance) return
      
      // Create daily checkpoint
      if (Date.now() - taskInstance.lastUpdateTime > 86400000) { // 24 hours
        this.createCheckpoint(taskInstance, 'Daily checkpoint')
        this.emit('task:daily-update', {
          taskId: taskInstance.id,
          daysRunning: Math.floor((Date.now() - taskInstance.startTime) / 86400000),
          status: taskInstance.status
        })
      }
    }, 300000) // Check every 5 minutes
    
    this.monitoringIntervals.set(task.id, monitorInterval)
  }
  
  /**
   * Process task output (called from WebSocket handler)
   */
  processOutput(taskId: string, output: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    task.output.push(output)
    task.latestOutput = output
    task.lastUpdateTime = Date.now()
    
    // Keep output buffer manageable
    if (task.output.length > 10000) {
      task.output = task.output.slice(-5000)
    }
    
    // Detect errors
    if (this.detectError(output)) {
      task.errors.push(output)
    }
    
    // Try to extract progress information
    const progress = this.extractProgress(output)
    if (progress !== null) {
      task.progress = progress
    }
    
    this.persistTask(task)
    
    // Emit to agent for real-time processing
    this.emit('task:output', {
      taskId,
      output,
      isError: this.detectError(output),
      progress: task.progress
    })
  }
  
  /**
   * Mark task as complete
   */
  async completeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    task.status = TaskStatus.COMPLETED
    task.endTime = Date.now()
    
    // Clean up monitoring
    const interval = this.monitoringIntervals.get(taskId)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(taskId)
    }
    
    this.persistTask(task)
    
    logger.info(`✅ Task completed: ${taskId} (${task.description})`)
    this.emit('task:completed', task)
  }
  
  /**
   * Helper methods
   */
  
  private getDefaultCheckInterval(type: TaskType): number {
    const intervals = {
      [TaskType.STREAMING]: 1000,      // 1 second
      [TaskType.BACKGROUND]: 5000,     // 5 seconds
      [TaskType.LONG_RUNNING]: 30000,  // 30 seconds
      [TaskType.MULTI_DAY]: 300000     // 5 minutes
    }
    return intervals[type]
  }
  
  private wrapCommandForPersistence(command: string, taskId: string): string {
    // Use nohup to keep process running even if terminal disconnects
    return `nohup ${command} > /tmp/task_${taskId}.out 2>&1 & echo $!`
  }
  
  private createCheckpoint(task: LongRunningTask, description: string): void {
    const checkpoint: TaskCheckpoint = {
      id: `cp_${Date.now()}`,
      timestamp: Date.now(),
      step: description,
      output: task.latestOutput || '',
      canRollback: false
    }
    
    task.checkpoints.push(checkpoint)
    this.persistTask(task)
    
    logger.info(`✅ Checkpoint created for task ${task.id}: ${description}`)
  }
  
  private extractProgress(output: string): number | null {
    // Extract progress from common patterns
    const patterns = [
      /(\d+)%/,                    // "45%"
      /(\d+)\/(\d+)/,              // "45/100"
      /\[(\d+)\/(\d+)\]/,          // "[45/100]"
      /progress:\s*(\d+)/i,        // "Progress: 45"
    ]
    
    for (const pattern of patterns) {
      const match = output.match(pattern)
      if (match) {
        if (match[2]) {
          // Fraction format
          return Math.round((parseInt(match[1]) / parseInt(match[2])) * 100)
        }
        return parseInt(match[1])
      }
    }
    
    return null
  }
  
  private detectError(output: string): boolean {
    const errorPatterns = [
      /error/i, /failed/i, /fatal/i, /exception/i,
      /cannot/i, /denied/i, /refused/i
    ]
    return errorPatterns.some(p => p.test(output))
  }
  
  private isResumableCommand(command: string): boolean {
    // Commands that can be resumed
    const resumablePatterns = [
      /rsync/, /scp/, /wget/, /curl/,
      /git\s+clone/, /npm\s+install/
    ]
    return resumablePatterns.some(p => p.test(command))
  }
  
  private checkTaskHealth(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    // Check if task has stalled (no output in expected time)
    const stalledTime = Date.now() - task.lastUpdateTime
    if (stalledTime > task.checkInterval * 10) {
      logger.warn(`⚠️ Task ${taskId} may be stalled (no output for ${stalledTime}ms)`)
      this.emit('task:stalled', task)
    }
  }
  
  private estimateProgress(task: LongRunningTask): number {
    // Estimate based on output patterns or time elapsed
    if (task.progress) return task.progress
    
    // Use metadata if available
    if (task.totalSteps && task.currentStep) {
      return Math.round((task.currentStep / task.totalSteps) * 100)
    }
    
    return 0
  }
  
  /**
   * Persistence methods
   */
  
  private persistTask(task: LongRunningTask): void {
    if (!task.persistAcrossSessions) return
    
    try {
      const tasks = this.loadPersistedTasksSync()
      tasks[task.id] = task
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('latenite_longrunning_tasks', JSON.stringify(tasks))
      }
    } catch (error) {
      logger.error(`Failed to persist task ${task.id}`, error)
    }
  }
  
  private loadPersistedTasks(): void {
    try {
      if (typeof localStorage === 'undefined') return
      
      const stored = localStorage.getItem('latenite_longrunning_tasks')
      if (!stored) return
      
      const tasks = JSON.parse(stored)
      
      // Restore tasks to memory
      Object.values(tasks).forEach((task: any) => {
        this.tasks.set(task.id, task)
        
        // Resume monitoring if task was running
        if (task.status === TaskStatus.RUNNING || task.status === TaskStatus.MONITORING) {
          logger.info(`📥 Restored task: ${task.id} (${task.description})`)
        }
      })
    } catch (error) {
      logger.error('Failed to load persisted tasks', error)
    }
  }
  
  private loadPersistedTasksSync(): Record<string, LongRunningTask> {
    try {
      if (typeof localStorage === 'undefined') return {}
      
      const stored = localStorage.getItem('latenite_longrunning_tasks')
      if (!stored) return {}
      
      return JSON.parse(stored)
    } catch (error) {
      return {}
    }
  }
  
  /**
   * Public API methods
   */
  
  getTask(taskId: string): LongRunningTask | undefined {
    return this.tasks.get(taskId)
  }
  
  getAllTasks(): LongRunningTask[] {
    return Array.from(this.tasks.values())
  }
  
  getActiveTasks(): LongRunningTask[] {
    return this.getAllTasks().filter(t => 
      t.status === TaskStatus.RUNNING || t.status === TaskStatus.MONITORING
    )
  }
  
  async cancelTask(taskId: string, sshSocket?: any): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    // Kill process if running
    if (task.metadata.pid && sshSocket) {
      sshSocket.emit('agent:command', {
        command: `kill ${task.metadata.pid}`,
        commandId: `cancel_${taskId}`,
        source: 'agent-cancel'
      })
    }
    
    task.status = TaskStatus.CANCELLED
    task.endTime = Date.now()
    
    // Stop monitoring
    const interval = this.monitoringIntervals.get(taskId)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(taskId)
    }
    
    this.persistTask(task)
    this.emit('task:cancelled', task)
  }
  
  async pauseTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    task.status = TaskStatus.PAUSED
    this.createCheckpoint(task, 'Task paused')
    
    // Pause monitoring
    const interval = this.monitoringIntervals.get(taskId)
    if (interval) {
      clearInterval(interval)
    }
    
    this.emit('task:paused', task)
  }
  
  async resumeTask(taskId: string, sshSocket?: any): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task || !task.canResume) return
    
    // Resume from last checkpoint
    await this.startTask(taskId, sshSocket)
    this.emit('task:resumed', task)
  }
}

export const longRunningTaskManager = LongRunningTaskManager.getInstance()

