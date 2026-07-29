// Can be used client or server side

import { TerminalAgentController } from './terminal-agent-integration'
import { getGlobalCache } from './agent-cache'

export interface CommandExecution {
  command: string
  result?: {
    stdout: string
    stderr: string
    exitCode: number
    duration: number
  }
  error?: string
  startTime: number
  endTime?: number
}

export interface ExecutionPlan {
  parallelGroups: string[][]
  sequentialGroups: string[][]
  dependencies: Map<string, string[]>
}

export class ParallelExecutor {
  private terminalAgent: TerminalAgentController

  constructor(terminalAgent: TerminalAgentController) {
    this.terminalAgent = terminalAgent
  }

  /**
   * Parse multiple commands from AI response
   * Supports various formats:
   * - Multiple ACTION: lines
   * - Commands separated by && or ;
   * - Numbered lists
   */
  parseMultipleCommands(aiResponse: string): string[] {
    const commands: string[] = []

    // Method 1: Multiple ACTION: lines
    const actionMatches = aiResponse.matchAll(/ACTION:\s*(.+?)(?=\n|ACTION:|$)/gs)
    for (const match of actionMatches) {
      const cmd = match[1].trim()
      if (cmd && cmd !== 'TASK_COMPLETE') {
        commands.push(cmd)
      }
    }

    // Method 2: Commands separated by && or ;
    if (commands.length === 0) {
      const singleAction = aiResponse.match(/ACTION:\s*(.+?)$/s)
      if (singleAction) {
        const commandsStr = singleAction[1].trim()
        // Split by && or ; but not within quotes
        const split = commandsStr.split(/(?<!\\)[;&]{1,2}(?=(?:[^"']*["'][^"']*["'])*[^"']*$)/)
        commands.push(...split.map(c => c.trim()).filter(Boolean))
      }
    }

    // Method 3: Numbered list (1. command, 2. command, etc.)
    if (commands.length === 0) {
      const numberedMatches = aiResponse.matchAll(/^\s*\d+\.\s*(.+?)$/gm)
      for (const match of numberedMatches) {
        const cmd = match[1].trim()
        if (cmd && !cmd.toLowerCase().startsWith('thought:') && !cmd.toLowerCase().startsWith('action:')) {
          commands.push(cmd)
        }
      }
    }

    return commands.filter(cmd => cmd !== 'TASK_COMPLETE')
  }

  /**
   * Analyze commands and create execution plan
   * Detects dependencies and groups commands for parallel execution
   */
  createExecutionPlan(commands: string[]): ExecutionPlan {
    const dependencies = new Map<string, string[]>()
    const parallelGroups: string[][] = []
    const sequentialGroups: string[][] = []

    // Detect dependencies between commands
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i]
      const cmdDeps: string[] = []

      // Check if this command depends on previous commands
      for (let j = 0; j < i; j++) {
        if (this.hasDependency(cmd, commands[j])) {
          cmdDeps.push(commands[j])
        }
      }

      dependencies.set(cmd, cmdDeps)
    }

    // Group commands by dependencies
    const processed = new Set<string>()
    let currentParallelGroup: string[] = []

    for (const cmd of commands) {
      const deps = dependencies.get(cmd) || []
      
      // If command has no unprocessed dependencies, can run in parallel
      const hasUnprocessedDeps = deps.some(dep => !processed.has(dep))
      
      if (hasUnprocessedDeps || this.mustRunSequentially(cmd)) {
        // Flush current parallel group
        if (currentParallelGroup.length > 0) {
          parallelGroups.push([...currentParallelGroup])
          currentParallelGroup = []
        }
        
        // Run sequentially
        sequentialGroups.push([cmd])
      } else {
        // Can run in parallel
        currentParallelGroup.push(cmd)
      }

      processed.add(cmd)
    }

    // Flush remaining parallel group
    if (currentParallelGroup.length > 0) {
      parallelGroups.push(currentParallelGroup)
    }

    return {
      parallelGroups,
      sequentialGroups,
      dependencies
    }
  }

  /**
   * Check if cmd2 depends on cmd1
   */
  private hasDependency(cmd1: string, cmd2: string): boolean {
    // Directory changes create dependencies
    if (cmd2.trim().startsWith('cd ')) {
      return true
    }

    // File creation/modification creates dependencies
    const writeOperations = ['>', '>>', 'touch', 'mkdir', 'mv', 'cp', 'rm']
    const hasWrite = writeOperations.some(op => cmd2.includes(op))
    
    if (hasWrite) {
      // Extract file/dir names from cmd2
      const filesInCmd2 = this.extractFileNames(cmd2)
      const filesInCmd1 = this.extractFileNames(cmd1)
      
      // Check if cmd1 uses any files modified by cmd2
      return filesInCmd1.some(f1 => filesInCmd2.some(f2 => f1.includes(f2) || f2.includes(f1)))
    }

    return false
  }

  /**
   * Extract file/directory names from command
   */
  private extractFileNames(command: string): string[] {
    const files: string[] = []
    
    // Match file paths (handles relative and absolute paths)
    const pathMatches = command.matchAll(/(?:^|\s)([./\w-]+(?:\/[./\w-]+)*)/g)
    for (const match of pathMatches) {
      files.push(match[1])
    }

    return files
  }

  /**
   * Check if command must run sequentially
   */
  private mustRunSequentially(command: string): boolean {
    const cmd = command.trim().toLowerCase()
    
    // Commands that modify state
    const sequentialKeywords = [
      'cd ',      // Directory changes
      'export ',  // Environment variables
      'source ',  // Source scripts
      'sudo ',    // Privilege escalation
      'su ',      // Switch user
      'npm install', // Package installation
      'pip install',
      'apt install',
      'yum install'
    ]

    return sequentialKeywords.some(keyword => cmd.startsWith(keyword))
  }

  /**
   * Check if command is safe to run in parallel
   */
  private isSafeForParallel(command: string): boolean {
    const cmd = command.trim().toLowerCase()
    
    // Read-only commands are safe
    const safeKeywords = [
      'ls', 'cat', 'grep', 'find', 'pwd', 'echo',
      'ps', 'top', 'df', 'du', 'free', 'uptime',
      'git status', 'git log', 'git diff',
      'npm list', 'pip list'
    ]

    return safeKeywords.some(keyword => cmd.startsWith(keyword))
  }

  /**
   * Execute commands in parallel batches
   */
  async executeBatch(commands: string[]): Promise<CommandExecution[]> {
    if (commands.length === 0) {
      return []
    }

    if (commands.length === 1) {
      // Single command - execute normally
      return [await this.executeSingle(commands[0])]
    }

    // Create execution plan
    const plan = this.createExecutionPlan(commands)
    const results: CommandExecution[] = []

    // Execute parallel groups
    for (const parallelGroup of plan.parallelGroups) {
      if (parallelGroup.length === 1) {
        results.push(await this.executeSingle(parallelGroup[0]))
      } else {
        // Execute in parallel
        const parallelResults = await Promise.all(
          parallelGroup.map(cmd => this.executeSingle(cmd))
        )
        results.push(...parallelResults)
      }
    }

    // Execute sequential groups
    for (const sequentialGroup of plan.sequentialGroups) {
      for (const cmd of sequentialGroup) {
        results.push(await this.executeSingle(cmd))
      }
    }

    return results
  }

  /**
   * Execute single command with caching
   */
  private async executeSingle(command: string): Promise<CommandExecution> {
    const execution: CommandExecution = {
      command,
      startTime: Date.now()
    }

    // Check cache first for read-only commands
    const cache = getGlobalCache()
    const cached = cache.getCachedCommand(command)
    
    if (cached) {
      console.log(`⚡ Command cache hit: ${command} (instant response)`)
      execution.endTime = Date.now()
      execution.result = cached
      execution.result.duration = execution.endTime - execution.startTime
      return execution
    }

    try {
      // Queue command with terminal agent
      await this.terminalAgent.queueCommand(command, `Parallel execution: ${command}`)
      
      // Wait for completion
      const result = await this.terminalAgent.waitForCommandCompletion(command)
      
      execution.endTime = Date.now()
      execution.result = {
        stdout: result?.stdout || '',
        stderr: result?.stderr || '',
        exitCode: result?.exitCode || 0,
        duration: execution.endTime - execution.startTime
      }
    } catch (error: any) {
      execution.endTime = Date.now()
      execution.error = error.message
      execution.result = {
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        duration: execution.endTime - execution.startTime
      }
    }

    return execution
  }

  /**
   * Aggregate results from multiple executions
   */
  aggregateResults(executions: CommandExecution[]): string {
    let output = ''

    for (const exec of executions) {
      output += `Command: ${exec.command}\n`
      
      if (exec.result) {
        if (exec.result.stdout) {
          output += `Output:\n${exec.result.stdout}\n`
        }
        if (exec.result.stderr) {
          output += `Errors:\n${exec.result.stderr}\n`
        }
        output += `Duration: ${exec.result.duration}ms\n`
      }
      
      if (exec.error) {
        output += `Error: ${exec.error}\n`
      }
      
      output += '\n---\n\n'
    }

    return output.trim()
  }

  /**
   * Get execution statistics
   */
  getStats(executions: CommandExecution[]): {
    total: number
    successful: number
    failed: number
    totalDuration: number
    avgDuration: number
    parallelizationGain: number
  } {
    const successful = executions.filter(e => !e.error && e.result?.exitCode === 0).length
    const failed = executions.length - successful
    const totalDuration = executions.reduce((sum, e) => sum + (e.result?.duration || 0), 0)
    const avgDuration = executions.length > 0 ? totalDuration / executions.length : 0
    
    // Calculate time saved by parallelization
    const sequentialDuration = executions.reduce((sum, e) => sum + (e.result?.duration || 0), 0)
    const actualDuration = Math.max(...executions.map(e => e.result?.duration || 0))
    const parallelizationGain = sequentialDuration > 0 ? (sequentialDuration / actualDuration) : 1

    return {
      total: executions.length,
      successful,
      failed,
      totalDuration,
      avgDuration,
      parallelizationGain
    }
  }
}
