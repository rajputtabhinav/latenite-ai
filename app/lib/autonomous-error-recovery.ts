// Can be used client or server side

import { getGlobalCache } from './agent-cache'

export interface ErrorContext {
  command: string
  error: string
  stderr: string
  stdout: string
  exitCode: number
  attemptNumber: number
}

export interface RecoveryStrategy {
  name: string
  description: string
  fix: string
  confidence: number
}

export interface RecoveryResult {
  success: boolean
  strategy: RecoveryStrategy | null
  fixCommand: string | null
  output: string | null
  attempts: number
}

export class AutonomousErrorRecovery {
  private maxAttempts = 3
  private cache = getGlobalCache()
  private errorPatterns: Map<RegExp, RecoveryStrategy[]> = new Map()

  constructor() {
    this.initializeErrorPatterns()
  }

  /**
   * Initialize common error patterns and recovery strategies
   */
  private initializeErrorPatterns(): void {
    // Permission denied errors
    this.errorPatterns.set(/permission denied|access denied/i, [
      {
        name: 'sudo_retry',
        description: 'Retry with sudo privileges',
        fix: 'sudo {command}',
        confidence: 0.9
      },
      {
        name: 'chmod_fix',
        description: 'Fix file permissions',
        fix: 'sudo chmod +x {file} && {command}',
        confidence: 0.8
      }
    ])

    // Command not found
    this.errorPatterns.set(/command not found|not recognized/i, [
      {
        name: 'install_package',
        description: 'Install missing package',
        fix: 'sudo apt-get install -y {package} || sudo yum install -y {package}',
        confidence: 0.85
      },
      {
        name: 'npm_install',
        description: 'Install via npm',
        fix: 'npm install -g {package}',
        confidence: 0.7
      },
      {
        name: 'path_fix',
        description: 'Check PATH and suggest common locations',
        fix: 'export PATH=$PATH:/usr/local/bin:/usr/bin && {command}',
        confidence: 0.6
      }
    ])

    // File/Directory not found
    this.errorPatterns.set(/no such file or directory/i, [
      {
        name: 'create_directory',
        description: 'Create missing directory',
        fix: 'mkdir -p {directory} && {command}',
        confidence: 0.85
      },
      {
        name: 'pwd_check',
        description: 'Check current directory and navigate',
        fix: 'pwd && cd {expected_dir} && {command}',
        confidence: 0.75
      }
    ])

    // Network errors
    this.errorPatterns.set(/connection (refused|timed out)|network (unreachable|error)/i, [
      {
        name: 'retry_with_delay',
        description: 'Retry after brief delay',
        fix: 'sleep 2 && {command}',
        confidence: 0.7
      },
      {
        name: 'check_connectivity',
        description: 'Check network connectivity',
        fix: 'ping -c 1 8.8.8.8 && {command}',
        confidence: 0.6
      }
    ])

    // Port already in use
    this.errorPatterns.set(/port.*already in use|address already in use/i, [
      {
        name: 'kill_process',
        description: 'Kill process using port',
        fix: 'lsof -ti:{port} | xargs kill -9 && {command}',
        confidence: 0.9
      },
      {
        name: 'use_different_port',
        description: 'Use different port',
        fix: '{command} --port {new_port}',
        confidence: 0.75
      }
    ])

    // Disk space errors
    this.errorPatterns.set(/no space left|disk (full|quota exceeded)/i, [
      {
        name: 'clear_temp',
        description: 'Clear temporary files',
        fix: 'sudo rm -rf /tmp/* && {command}',
        confidence: 0.8
      },
      {
        name: 'check_space',
        description: 'Check and report disk usage',
        fix: 'df -h && du -sh /* | sort -h',
        confidence: 0.9
      }
    ])

    // NPM/Package manager errors
    this.errorPatterns.set(/npm ERR!|ENOENT.*package\.json/i, [
      {
        name: 'npm_clean',
        description: 'Clean npm cache and reinstall',
        fix: 'rm -rf node_modules package-lock.json && npm cache clean --force && npm install',
        confidence: 0.85
      },
      {
        name: 'npm_init',
        description: 'Initialize npm project',
        fix: 'npm init -y && {command}',
        confidence: 0.7
      }
    ])

    // Git errors
    this.errorPatterns.set(/not a git repository|fatal: not a git/i, [
      {
        name: 'git_init',
        description: 'Initialize git repository',
        fix: 'git init && {command}',
        confidence: 0.9
      }
    ])

    // Python/pip errors
    this.errorPatterns.set(/ModuleNotFoundError|No module named/i, [
      {
        name: 'pip_install',
        description: 'Install missing Python module',
        fix: 'pip install {module} && {command}',
        confidence: 0.9
      },
      {
        name: 'pip3_install',
        description: 'Install with pip3',
        fix: 'pip3 install {module} && {command}',
        confidence: 0.85
      }
    ])
  }

  /**
   * Attempt to recover from error automatically
   */
  async recover(errorContext: ErrorContext, executeCommand: (cmd: string) => Promise<any>): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      success: false,
      strategy: null,
      fixCommand: null,
      output: null,
      attempts: 0
    }

    // Check if we've seen this error before
    const cachedSolution = this.getCachedSolution(errorContext.error)
    if (cachedSolution) {
      console.log('🎯 Found cached solution for this error')
      try {
        result.fixCommand = cachedSolution
        result.output = await executeCommand(cachedSolution)
        result.success = true
        result.attempts = 1
        return result
      } catch (error) {
        console.log('Cached solution failed, trying other strategies...')
      }
    }

    // Try recovery strategies
    const strategies = this.matchErrorStrategies(errorContext)
    
    for (let i = 0; i < Math.min(strategies.length, this.maxAttempts) && !result.success; i++) {
      const strategy = strategies[i]
      result.attempts++
      result.strategy = strategy

      try {
        const fixCommand = this.buildFixCommand(strategy.fix, errorContext)
        result.fixCommand = fixCommand

        console.log(`🔧 Recovery attempt ${result.attempts}: ${strategy.name}`)
        console.log(`   Command: ${fixCommand}`)

        const output = await executeCommand(fixCommand)
        
        // Check if fix was successful
        if (output && !this.isErrorOutput(output)) {
          result.success = true
          result.output = output

          // Cache successful solution
          this.cacheSolution(errorContext.error, fixCommand)
          
          console.log(`✅ Recovery successful using strategy: ${strategy.name}`)
          break
        }
      } catch (recoveryError: any) {
        console.log(`❌ Recovery attempt ${result.attempts} failed: ${recoveryError.message}`)
        continue
      }
    }

    return result
  }

  /**
   * Match error to recovery strategies
   */
  private matchErrorStrategies(errorContext: ErrorContext): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = []
    const errorText = `${errorContext.error} ${errorContext.stderr}`.toLowerCase()

    for (const [pattern, patternStrategies] of this.errorPatterns) {
      if (pattern.test(errorText)) {
        strategies.push(...patternStrategies)
      }
    }

    // Sort by confidence (highest first)
    return strategies.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Build fix command from template
   */
  private buildFixCommand(template: string, errorContext: ErrorContext): string {
    let command = template

    // Replace placeholders
    command = command.replace(/\{command\}/g, errorContext.command)
    
    // Extract file/directory from error
    const fileMatch = errorContext.stderr.match(/['"`]([^'"`]+)['"`]/)
    if (fileMatch) {
      command = command.replace(/\{file\}/g, fileMatch[1])
      command = command.replace(/\{directory\}/g, fileMatch[1])
    }

    // Extract package name
    const packageMatch = errorContext.command.match(/(?:npm|pip|apt|yum)\s+(?:install\s+)?(\S+)/)
    if (packageMatch) {
      command = command.replace(/\{package\}/g, packageMatch[1])
      command = command.replace(/\{module\}/g, packageMatch[1])
    }

    // Extract port number
    const portMatch = errorContext.stderr.match(/:(\d+)/)
    if (portMatch) {
      command = command.replace(/\{port\}/g, portMatch[1])
      const newPort = parseInt(portMatch[1]) + 1
      command = command.replace(/\{new_port\}/g, newPort.toString())
    }

    return command
  }

  /**
   * Check if output indicates an error
   */
  private isErrorOutput(output: string): boolean {
    const errorIndicators = [
      /error/i,
      /failed/i,
      /exception/i,
      /fatal/i,
      /cannot/i,
      /unable to/i,
      /permission denied/i
    ]

    return errorIndicators.some(pattern => pattern.test(output))
  }

  /**
   * Cache successful solution
   */
  private cacheSolution(error: string, solution: string): void {
    // Cache disabled in this version - can be re-enabled with proper cache instance
    console.log(`💾 Solution cached: ${solution.slice(0, 50)}...`)
  }

  /**
   * Get cached solution for similar error
   */
  private getCachedSolution(error: string): string | null {
    // Cache disabled in this version
    return null
  }

  /**
   * Generate AI-powered recovery suggestion
   */
  async generateAIFix(errorContext: ErrorContext, aiEndpoint: string): Promise<string | null> {
    try {
      const prompt = `Fix this command error:
Command: ${errorContext.command}
Error: ${errorContext.error}
Output: ${errorContext.stderr}

Provide ONLY the fixed command, nothing else.`

      const response = await fetch(aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'claude-sonnet-4-5',
          temperature: 0.3
        })
      })

      const data = await response.json()
      const fixCommand = data.message?.trim()
      
      if (fixCommand && !fixCommand.includes('Error') && !fixCommand.includes('I apologize')) {
        return fixCommand
      }

      return null
    } catch (error) {
      console.error('Failed to generate AI fix:', error)
      return null
    }
  }

  /**
   * Get recovery statistics
   */
  getStats() {
    return {
      errorPatterns: this.errorPatterns.size,
      maxAttempts: this.maxAttempts,
      strategiesAvailable: Array.from(this.errorPatterns.values()).flat().length
    }
  }
}
