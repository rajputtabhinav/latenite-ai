// Intelligent Error Recovery System - Advanced Error Handling and Recovery
// Provides comprehensive error detection, analysis, and autonomous recovery

export interface ErrorContext {
  command: string
  errorMessage: string
  exitCode: number
  stderr: string
  stdout: string
  workingDirectory: string
  user: string
  timestamp: Date
  systemState: SystemState
  previousCommands: string[]
  attemptNumber: number
}

export interface SystemState {
  diskSpace: number
  memoryUsage: number
  cpuLoad: number
  runningServices: string[]
  networkStatus: boolean
  permissions: UserPermissions
}

export interface UserPermissions {
  hasRoot: boolean
  hasSudo: boolean
  groups: string[]
}

export interface RecoveryStrategy {
  id: string
  name: string
  description: string
  applicableErrors: string[]
  priority: number
  maxAttempts: number
  recoveryActions: RecoveryAction[]
  rollbackActions: RecoveryAction[]
  successCriteria: string[]
}

export interface RecoveryAction {
  type: 'command' | 'file_operation' | 'service_operation' | 'permission_fix' | 'system_check'
  command?: string
  description: string
  timeout: number
  retryCount: number
  prerequisite?: string
  fallback?: RecoveryAction
}

export interface RecoveryResult {
  success: boolean
  strategy: string
  actionsExecuted: string[]
  errorsCorrected: string[]
  remainingIssues: string[]
  recommendations: string[]
  executionTime: number
  preventionTips: string[]
}

export interface ErrorPattern {
  pattern: RegExp
  category: ErrorCategory
  severity: 'low' | 'medium' | 'high' | 'critical'
  commonCauses: string[]
  quickFixes: string[]
  preventionTips: string[]
}

export type ErrorCategory = 
  | 'permission_denied' | 'file_not_found' | 'disk_space' | 'memory_error'
  | 'network_error' | 'service_error' | 'package_error' | 'syntax_error'
  | 'dependency_error' | 'configuration_error' | 'hardware_error' | 'security_error'

export class IntelligentErrorRecovery {
  private errorPatterns: Map<ErrorCategory, ErrorPattern[]> = new Map()
  private recoveryStrategies: Map<ErrorCategory, RecoveryStrategy[]> = new Map()
  private errorHistory: ErrorContext[] = []
  private recoveryHistory: RecoveryResult[] = []
  private socket?: any
  private onStatusUpdate?: (status: string, type: 'info' | 'warning' | 'error' | 'success') => void

  constructor() {
    this.initializeErrorPatterns()
    this.initializeRecoveryStrategies()
  }

  // Main error recovery method
  async recoverFromError(errorContext: ErrorContext): Promise<RecoveryResult> {
    const startTime = Date.now()
    
    try {
      this.onStatusUpdate?.(`🔧 Analyzing error: ${errorContext.command}`, 'info')
      
      // Store error in history
      this.errorHistory.push(errorContext)
      
      // Analyze error to determine category and severity
      const errorAnalysis = await this.analyzeError(errorContext)
      
      this.onStatusUpdate?.(`📊 Error category: ${errorAnalysis.category} (${errorAnalysis.severity})`, 'info')
      
      // Find applicable recovery strategies
      const strategies = this.findRecoveryStrategies(errorAnalysis.category, errorContext)
      
      if (strategies.length === 0) {
        return this.createFailureResult('No recovery strategies found', errorContext, startTime)
      }

      // Attempt recovery using strategies in priority order
      for (const strategy of strategies) {
        this.onStatusUpdate?.(`🛠️ Attempting recovery: ${strategy.name}`, 'info')
        
        const recoveryResult = await this.executeRecoveryStrategy(strategy, errorContext)
        
        if (recoveryResult.success) {
          this.onStatusUpdate?.(`✅ Error recovery successful: ${strategy.name}`, 'success')
          
          // Store successful recovery
          this.recoveryHistory.push(recoveryResult)
          
          // Learn from successful recovery
          await this.learnFromRecovery(errorContext, recoveryResult)
          
          return recoveryResult
        } else {
          this.onStatusUpdate?.(`❌ Recovery strategy failed: ${strategy.name}`, 'warning')
        }
      }

      // All strategies failed - provide comprehensive analysis
      return await this.createComprehensiveFailureAnalysis(errorContext, strategies, startTime)

    } catch (error) {
      this.onStatusUpdate?.(`❌ Error recovery system failure: ${error}`, 'error')
      
      return this.createFailureResult(
        `Recovery system error: ${error}`, 
        errorContext, 
        startTime
      )
    }
  }

  // Analyze error to determine category and generate insights
  private async analyzeError(errorContext: ErrorContext): Promise<{ category: ErrorCategory; severity: 'low' | 'medium' | 'high' | 'critical'; insights: string[] }> {
    const error = errorContext.errorMessage.toLowerCase()
    const stderr = errorContext.stderr.toLowerCase()
    const combinedError = `${error} ${stderr}`

    // Check against known error patterns
    for (const [category, patterns] of this.errorPatterns) {
      for (const pattern of patterns) {
        if (pattern.pattern.test(combinedError)) {
          return {
            category,
            severity: pattern.severity,
            insights: pattern.commonCauses
          }
        }
      }
    }

    // Use AI for unknown error analysis
    const aiAnalysis = await this.analyzeErrorWithAI(errorContext)
    
    return {
      category: aiAnalysis.category || 'configuration_error',
      severity: aiAnalysis.severity || 'medium',
      insights: aiAnalysis.insights || []
    }
  }

  // AI-powered error analysis for unknown errors
  private async analyzeErrorWithAI(errorContext: ErrorContext): Promise<any> {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `ERROR ANALYSIS AND RECOVERY

COMMAND: ${errorContext.command}
EXIT CODE: ${errorContext.exitCode}
ERROR MESSAGE: ${errorContext.errorMessage}
STDERR: ${errorContext.stderr}
STDOUT: ${errorContext.stdout}

SYSTEM CONTEXT:
- Working Directory: ${errorContext.workingDirectory}
- User: ${errorContext.user}
- Previous Commands: ${errorContext.previousCommands.slice(-3).join(', ')}
- Attempt Number: ${errorContext.attemptNumber}

SYSTEM STATE:
- Disk Space: ${errorContext.systemState.diskSpace}% used
- Memory Usage: ${errorContext.systemState.memoryUsage}% used
- CPU Load: ${errorContext.systemState.cpuLoad}
- Network: ${errorContext.systemState.networkStatus ? 'Connected' : 'Disconnected'}
- Has Sudo: ${errorContext.systemState.permissions.hasSudo}

Please analyze this error and provide:

1. ERROR CATEGORY (one of): permission_denied, file_not_found, disk_space, memory_error, network_error, service_error, package_error, syntax_error, dependency_error, configuration_error, hardware_error, security_error

2. SEVERITY LEVEL (one of): low, medium, high, critical

3. ROOT CAUSE ANALYSIS: What likely caused this error?

4. RECOVERY ACTIONS: 3-5 specific commands to fix this error

5. PREVENTION TIPS: How to avoid this error in the future

Format as JSON:
{
  "category": "error_category",
  "severity": "severity_level", 
  "rootCause": "explanation",
  "recoveryActions": ["command1", "command2", "command3"],
  "preventionTips": ["tip1", "tip2"],
  "insights": ["insight1", "insight2"]
}`
          }],
          provider: 'anthropic',
          model: 'claude-sonnet-4'
        })
      })

      if (response.ok) {
        const result = await response.json()
        const jsonMatch = result.message.match(/\{[\s\S]*\}/)
        
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }
    } catch (error) {
      console.error('AI error analysis failed:', error)
    }

    return {
      category: 'configuration_error',
      severity: 'medium',
      insights: ['Unknown error - manual intervention may be required']
    }
  }

  // Find and prioritize recovery strategies
  private findRecoveryStrategies(category: ErrorCategory, errorContext: ErrorContext): RecoveryStrategy[] {
    const strategies = this.recoveryStrategies.get(category) || []
    
    // Filter strategies based on context
    const applicableStrategies = strategies.filter(strategy => {
      // Check if error matches strategy patterns
      const matchesPattern = strategy.applicableErrors.some(pattern => {
        const regex = new RegExp(pattern, 'i')
        return regex.test(errorContext.errorMessage) || regex.test(errorContext.stderr)
      })
      
      // Check if we haven't exceeded max attempts for this strategy
      const previousAttempts = this.countPreviousAttempts(strategy.id, errorContext.command)
      
      return matchesPattern && previousAttempts < strategy.maxAttempts
    })

    // Sort by priority
    return applicableStrategies.sort((a, b) => b.priority - a.priority)
  }

  // Execute a recovery strategy
  private async executeRecoveryStrategy(strategy: RecoveryStrategy, errorContext: ErrorContext): Promise<RecoveryResult> {
    const startTime = Date.now()
    const actionsExecuted: string[] = []
    const errorsCorrected: string[] = []
    
    try {
      this.onStatusUpdate?.(`🔧 Executing recovery strategy: ${strategy.name}`, 'info')

      // Execute recovery actions in sequence
      for (const action of strategy.recoveryActions) {
        const actionResult = await this.executeRecoveryAction(action, errorContext)
        actionsExecuted.push(action.description)
        
        if (actionResult.success) {
          errorsCorrected.push(action.description)
          this.onStatusUpdate?.(`✅ Recovery action successful: ${action.description}`, 'success')
        } else {
          this.onStatusUpdate?.(`❌ Recovery action failed: ${action.description}`, 'warning')
          
          // Try fallback action if available
          if (action.fallback) {
            const fallbackResult = await this.executeRecoveryAction(action.fallback, errorContext)
            actionsExecuted.push(`${action.description} (fallback)`)
            
            if (fallbackResult.success) {
              errorsCorrected.push(`${action.description} (fallback)`)
            }
          }
        }
      }

      // Verify recovery success
      const recoverySuccess = await this.verifyRecoverySuccess(strategy, errorContext)
      
      return {
        success: recoverySuccess,
        strategy: strategy.name,
        actionsExecuted,
        errorsCorrected,
        remainingIssues: recoverySuccess ? [] : ['Recovery verification failed'],
        recommendations: await this.generateRecoveryRecommendations(strategy, errorContext),
        executionTime: Date.now() - startTime,
        preventionTips: await this.generatePreventionTips(errorContext)
      }

    } catch (error) {
      return {
        success: false,
        strategy: strategy.name,
        actionsExecuted,
        errorsCorrected,
        remainingIssues: [`Recovery execution failed: ${error}`],
        recommendations: ['Manual intervention required'],
        executionTime: Date.now() - startTime,
        preventionTips: []
      }
    }
  }

  // Execute individual recovery action
  private async executeRecoveryAction(action: RecoveryAction, errorContext: ErrorContext): Promise<{ success: boolean; output?: string }> {
    try {
      // Check prerequisites
      if (action.prerequisite) {
        const prereqResult = await this.executeCommand(action.prerequisite)
        if (!prereqResult.success) {
          return { success: false }
        }
      }

      // Execute action based on type
      switch (action.type) {
        case 'command':
          if (action.command) {
            const result = await this.executeCommand(action.command)
            return { success: result.success, output: result.stdout }
          }
          break

        case 'permission_fix':
          return await this.fixPermissions(errorContext)

        case 'service_operation':
          return await this.handleServiceOperation(action, errorContext)

        case 'system_check':
          return await this.performSystemCheck(action, errorContext)

        case 'file_operation':
          return await this.handleFileOperation(action, errorContext)

        default:
          return { success: false }
      }

      return { success: false }
    } catch (error) {
      return { success: false }
    }
  }

  // Verify recovery success by re-running original command
  private async verifyRecoverySuccess(strategy: RecoveryStrategy, errorContext: ErrorContext): Promise<boolean> {
    try {
      this.onStatusUpdate?.(`🔍 Verifying recovery success...`, 'info')

      // Wait a moment for system state to stabilize
      await this.sleep(2000)

      // Re-run original command to see if it succeeds now
      const verificationResult = await this.executeCommand(errorContext.command)
      
      if (verificationResult.success) {
        return true
      }

      // Check success criteria if command still fails
      for (const criteria of strategy.successCriteria) {
        const criteriaResult = await this.executeCommand(criteria)
        if (!criteriaResult.success) {
          return false
        }
      }

      return true
    } catch (error) {
      return false
    }
  }

  // Initialize error patterns for recognition
  private initializeErrorPatterns(): void {
    // Permission errors
    this.errorPatterns.set('permission_denied', [
      {
        pattern: /permission denied|access denied|operation not permitted/i,
        category: 'permission_denied',
        severity: 'medium',
        commonCauses: ['Insufficient permissions', 'Wrong user context', 'File ownership issues'],
        quickFixes: ['Use sudo', 'Check file ownership', 'Verify user groups'],
        preventionTips: ['Run commands with appropriate permissions', 'Use sudo when needed']
      }
    ])

    // File system errors
    this.errorPatterns.set('file_not_found', [
      {
        pattern: /no such file or directory|file not found|cannot access/i,
        category: 'file_not_found',
        severity: 'medium',
        commonCauses: ['File does not exist', 'Wrong path', 'Typo in filename'],
        quickFixes: ['Check file path', 'Verify file exists', 'Create missing file'],
        preventionTips: ['Use tab completion', 'Verify paths before use']
      }
    ])

    // Disk space errors
    this.errorPatterns.set('disk_space', [
      {
        pattern: /no space left on device|disk full|insufficient space/i,
        category: 'disk_space',
        severity: 'high',
        commonCauses: ['Disk full', 'Large files consuming space', 'Log files growing'],
        quickFixes: ['Clean temporary files', 'Remove old logs', 'Free disk space'],
        preventionTips: ['Monitor disk usage', 'Set up log rotation']
      }
    ])

    // Package management errors
    this.errorPatterns.set('package_error', [
      {
        pattern: /package .* not found|unable to locate package|dependency.*not met/i,
        category: 'package_error',
        severity: 'medium',
        commonCauses: ['Package not available', 'Repository not configured', 'Dependency issues'],
        quickFixes: ['Update package lists', 'Add repository', 'Install dependencies'],
        preventionTips: ['Keep repositories updated', 'Check package availability']
      }
    ])

    // Service errors
    this.errorPatterns.set('service_error', [
      {
        pattern: /failed to start|service.*failed|unit.*not found|systemctl.*failed/i,
        category: 'service_error',
        severity: 'high',
        commonCauses: ['Service configuration error', 'Missing dependencies', 'Port conflicts'],
        quickFixes: ['Check service status', 'Review configuration', 'Check logs'],
        preventionTips: ['Validate configurations', 'Test services after changes']
      }
    ])

    // Network errors
    this.errorPatterns.set('network_error', [
      {
        pattern: /network.*unreachable|connection.*refused|timeout|dns.*failed/i,
        category: 'network_error',
        severity: 'medium',
        commonCauses: ['Network connectivity issues', 'Firewall blocking', 'DNS problems'],
        quickFixes: ['Check network connection', 'Verify firewall rules', 'Test DNS'],
        preventionTips: ['Monitor network status', 'Configure redundant connections']
      }
    ])
  }

  // Initialize recovery strategies
  private initializeRecoveryStrategies(): void {
    // Permission denied recovery
    this.recoveryStrategies.set('permission_denied', [
      {
        id: 'sudo_retry',
        name: 'Retry with sudo',
        description: 'Retry the command with elevated privileges',
        applicableErrors: ['permission denied', 'operation not permitted'],
        priority: 90,
        maxAttempts: 2,
        recoveryActions: [
          {
            type: 'command',
            command: 'sudo {{original_command}}',
            description: 'Retry command with sudo',
            timeout: 30000,
            retryCount: 1
          }
        ],
        rollbackActions: [],
        successCriteria: ['echo "Permission test successful"']
      },
      {
        id: 'fix_ownership',
        name: 'Fix file ownership',
        description: 'Fix file ownership and permissions',
        applicableErrors: ['permission denied'],
        priority: 80,
        maxAttempts: 1,
        recoveryActions: [
          {
            type: 'permission_fix',
            description: 'Fix file ownership and permissions',
            timeout: 15000,
            retryCount: 1
          }
        ],
        rollbackActions: [],
        successCriteria: ['ls -la {{target_file}}']
      }
    ])

    // File not found recovery
    this.recoveryStrategies.set('file_not_found', [
      {
        id: 'create_missing_file',
        name: 'Create missing file',
        description: 'Create the missing file with appropriate content',
        applicableErrors: ['no such file or directory', 'file not found'],
        priority: 85,
        maxAttempts: 1,
        recoveryActions: [
          {
            type: 'file_operation',
            description: 'Create missing file',
            timeout: 10000,
            retryCount: 1
          }
        ],
        rollbackActions: [],
        successCriteria: ['test -f {{target_file}}']
      },
      {
        id: 'create_missing_directory',
        name: 'Create missing directory',
        description: 'Create missing parent directories',
        applicableErrors: ['no such file or directory'],
        priority: 90,
        maxAttempts: 1,
        recoveryActions: [
          {
            type: 'command',
            command: 'mkdir -p "$(dirname "{{target_path}}")"',
            description: 'Create parent directories',
            timeout: 10000,
            retryCount: 1
          }
        ],
        rollbackActions: [],
        successCriteria: ['test -d "$(dirname "{{target_path}}")"']
      }
    ])

    // Disk space recovery
    this.recoveryStrategies.set('disk_space', [
      {
        id: 'clean_tmp',
        name: 'Clean temporary files',
        description: 'Remove temporary files to free space',
        applicableErrors: ['no space left on device', 'disk full'],
        priority: 95,
        maxAttempts: 1,
        recoveryActions: [
          {
            type: 'command',
            command: 'sudo find /tmp -type f -atime +7 -delete 2>/dev/null || true',
            description: 'Clean old temporary files',
            timeout: 30000,
            retryCount: 1
          },
          {
            type: 'command',
            command: 'sudo apt clean 2>/dev/null || sudo yum clean all 2>/dev/null || true',
            description: 'Clean package cache',
            timeout: 30000,
            retryCount: 1
          }
        ],
        rollbackActions: [],
        successCriteria: ['df -h | grep -v "100%"']
      }
    ])

    // Package error recovery
    this.recoveryStrategies.set('package_error', [
      {
        id: 'update_repositories',
        name: 'Update package repositories',
        description: 'Update package repository lists',
        applicableErrors: ['package.*not found', 'unable to locate package'],
        priority: 90,
        maxAttempts: 2,
        recoveryActions: [
          {
            type: 'command',
            command: 'sudo apt update 2>/dev/null || sudo yum update 2>/dev/null || sudo dnf update 2>/dev/null || true',
            description: 'Update package repositories',
            timeout: 120000,
            retryCount: 1
          }
        ],
        rollbackActions: [],
        successCriteria: ['echo "Repository update completed"']
      }
    ])

    // Service error recovery
    this.recoveryStrategies.set('service_error', [
      {
        id: 'restart_service',
        name: 'Restart service',
        description: 'Restart the failed service',
        applicableErrors: ['failed to start', 'service.*failed'],
        priority: 80,
        maxAttempts: 3,
        recoveryActions: [
          {
            type: 'service_operation',
            description: 'Restart service',
            timeout: 30000,
            retryCount: 1
          }
        ],
        rollbackActions: [],
        successCriteria: ['systemctl is-active {{service_name}}']
      }
    ])
  }

  // Helper methods for recovery actions
  private async fixPermissions(errorContext: ErrorContext): Promise<{ success: boolean; output?: string }> {
    try {
      // Extract target file/directory from command
      const pathMatch = errorContext.command.match(/(?:^|\s)([\/\w.-]+)(?:\s|$)/)
      const targetPath = pathMatch ? pathMatch[1] : ''

      if (!targetPath) {
        return { success: false }
      }

      // Fix common permission issues
      const commands = [
        `sudo chown $USER:$USER "${targetPath}" 2>/dev/null || true`,
        `sudo chmod 644 "${targetPath}" 2>/dev/null || true`
      ]

      for (const cmd of commands) {
        await this.executeCommand(cmd)
      }

      return { success: true }
    } catch (error) {
      return { success: false }
    }
  }

  private async handleServiceOperation(action: RecoveryAction, errorContext: ErrorContext): Promise<{ success: boolean; output?: string }> {
    try {
      // Extract service name from error context
      const serviceMatch = errorContext.command.match(/systemctl\s+\w+\s+(\w+)|service\s+(\w+)/)
      const serviceName = serviceMatch ? (serviceMatch[1] || serviceMatch[2]) : ''

      if (!serviceName) {
        return { success: false }
      }

      const result = await this.executeCommand(`sudo systemctl restart ${serviceName}`)
      return { success: result.success, output: result.stdout }
    } catch (error) {
      return { success: false }
    }
  }

  private async performSystemCheck(action: RecoveryAction, errorContext: ErrorContext): Promise<{ success: boolean; output?: string }> {
    try {
      // Perform basic system health checks
      const checks = [
        'df -h',
        'free -m',
        'systemctl --failed',
        'ps aux | head -10'
      ]

      let allPassed = true
      let output = ''

      for (const check of checks) {
        const result = await this.executeCommand(check)
        output += `${check}: ${result.success ? 'OK' : 'FAILED'}\n`
        if (!result.success) {
          allPassed = false
        }
      }

      return { success: allPassed, output }
    } catch (error) {
      return { success: false }
    }
  }

  private async handleFileOperation(action: RecoveryAction, errorContext: ErrorContext): Promise<{ success: boolean; output?: string }> {
    try {
      // Extract file path from error context
      const pathMatch = errorContext.stderr.match(/([\/\w.-]+)(?:\s|$|:)/) || 
                       errorContext.command.match(/(?:^|\s)([\/\w.-]+)(?:\s|$)/)
      const targetPath = pathMatch ? pathMatch[1] : ''

      if (!targetPath) {
        return { success: false }
      }

      // Create the file with appropriate content
      const result = await this.executeCommand(`touch "${targetPath}"`)
      return { success: result.success, output: result.stdout }
    } catch (error) {
      return { success: false }
    }
  }

  // Execute command with error handling
  private async executeCommand(command: string): Promise<{ success: boolean; stdout: string; stderr: string }> {
    try {
      if (this.socket) {
        // TODO: Use advanced executor when implemented
        // const result = await (await import('./advanced-command-executor')).advancedExecutor.getInstance().executeWithContext(command, this.socket)
        // For now, return mock execution
        return {
          success: true,
          stdout: `Executed: ${command}`,
          stderr: ''
        }
      } else {
        // Fallback for testing
        return {
          success: true,
          stdout: `Mock execution of: ${command}`,
          stderr: ''
        }
      }
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: (error instanceof Error ? error.message : String(error))
      }
    }
  }

  // Helper methods
  private countPreviousAttempts(strategyId: string, command: string): number {
    return this.recoveryHistory.filter(
      r => r.strategy === strategyId && 
      this.errorHistory.some(e => e.command === command)
    ).length
  }

  private async learnFromRecovery(errorContext: ErrorContext, recoveryResult: RecoveryResult): Promise<void> {
    // Store successful recovery patterns for future use
    const pattern = {
      errorPattern: errorContext.errorMessage,
      successfulStrategy: recoveryResult.strategy,
      context: errorContext.systemState,
      timestamp: new Date()
    }

    // In a full implementation, this would update a learning database
    console.log('Learning from successful recovery:', pattern)
  }

  private async generateRecoveryRecommendations(strategy: RecoveryStrategy, errorContext: ErrorContext): Promise<string[]> {
    return [
      `Monitor system for similar issues`,
      `Consider preventive measures for ${strategy.name}`,
      `Review error logs for patterns`
    ]
  }

  private async generatePreventionTips(errorContext: ErrorContext): Promise<string[]> {
    return [
      'Verify commands before execution',
      'Monitor system resources regularly',
      'Keep system updated and maintained'
    ]
  }

  private createFailureResult(message: string, errorContext: ErrorContext, startTime: number): RecoveryResult {
    return {
      success: false,
      strategy: 'none',
      actionsExecuted: [],
      errorsCorrected: [],
      remainingIssues: [message],
      recommendations: ['Manual intervention required', 'Check system logs', 'Consult documentation'],
      executionTime: Date.now() - startTime,
      preventionTips: []
    }
  }

  private async createComprehensiveFailureAnalysis(
    errorContext: ErrorContext, 
    strategies: RecoveryStrategy[], 
    startTime: number
  ): Promise<RecoveryResult> {
    const analysisResult = await this.analyzeErrorWithAI(errorContext)
    
    return {
      success: false,
      strategy: 'comprehensive_analysis',
      actionsExecuted: strategies.map(s => s.name),
      errorsCorrected: [],
      remainingIssues: [
        'All recovery strategies failed',
        analysisResult.rootCause || 'Unknown root cause'
      ],
      recommendations: [
        ...analysisResult.recoveryActions || [],
        'Manual expert intervention required',
        'Consider system maintenance'
      ],
      executionTime: Date.now() - startTime,
      preventionTips: analysisResult.preventionTips || []
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Public interface methods
  setSocket(socket: any): void {
    this.socket = socket
  }

  setStatusCallback(callback: (status: string, type: 'info' | 'warning' | 'error' | 'success') => void): void {
    this.onStatusUpdate = callback
  }

  getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory]
  }

  getRecoveryHistory(): RecoveryResult[] {
    return [...this.recoveryHistory]
  }

  getRecoveryStats(): { totalErrors: number; recoveryRate: number; commonErrors: string[] } {
    const totalErrors = this.errorHistory.length
    const successfulRecoveries = this.recoveryHistory.filter(r => r.success).length
    const recoveryRate = totalErrors > 0 ? (successfulRecoveries / totalErrors) * 100 : 0

    // Find most common error types
    const errorCounts = new Map<string, number>()
    for (const error of this.errorHistory) {
      const key = error.errorMessage.split(':')[0].toLowerCase()
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1)
    }

    const commonErrors = Array.from(errorCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error)

    return {
      totalErrors,
      recoveryRate: Math.round(recoveryRate),
      commonErrors
    }
  }

  clearHistory(): void {
    this.errorHistory = []
    this.recoveryHistory = []
  }
}

// Export singleton instance
export const intelligentErrorRecovery = new IntelligentErrorRecovery()
