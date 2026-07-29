// Enhanced AI Agent Capabilities - Cursor-like Intelligence

export interface FileContext {
  path: string
  content?: string
  language?: string
  errors?: string[]
  imports?: string[]
  exports?: string[]
}

export interface ProjectContext {
  rootDir: string
  files: FileContext[]
  dependencies: Record<string, string>
  scripts: Record<string, string>
  gitBranch?: string
  hasErrors: boolean
}

export interface AgentCapability {
  name: string
  description: string
  enabled: boolean
  icon: string
}

export class EnhancedAgentController {
  private capabilities: Map<string, AgentCapability> = new Map()
  private projectContext: ProjectContext | null = null
  private commandBuffer: string[] = []

  constructor() {
    this.initializeCapabilities()
  }

  private initializeCapabilities() {
    const capabilities: AgentCapability[] = [
      {
        name: 'Multi-File Editing',
        description: 'Edit multiple files simultaneously with context awareness',
        enabled: true,
        icon: '📝'
      },
      {
        name: 'Error Detection & Auto-Fix',
        description: 'Automatically detect errors and suggest fixes',
        enabled: true,
        icon: '🔧'
      },
      {
        name: 'Code Context Awareness',
        description: 'Understand entire codebase context',
        enabled: true,
        icon: '🧠'
      },
      {
        name: 'Smart Command Completion',
        description: 'AI-powered command autocomplete',
        enabled: true,
        icon: '⚡'
      },
      {
        name: 'Documentation Search',
        description: 'Instant access to latest documentation',
        enabled: true,
        icon: '📚'
      },
      {
        name: 'Real-time Collaboration',
        description: 'Share terminal sessions and code',
        enabled: true,
        icon: '🤝'
      },
      {
        name: 'Git Integration',
        description: 'Smart git commands and branch management',
        enabled: true,
        icon: '🔀'
      },
      {
        name: 'Package Management',
        description: 'Intelligent package installation and updates',
        enabled: true,
        icon: '📦'
      },
      {
        name: 'Performance Monitoring',
        description: 'Real-time performance analysis',
        enabled: true,
        icon: '📊'
      },
      {
        name: 'Security Scanning',
        description: 'Automated security vulnerability detection',
        enabled: true,
        icon: '🔒'
      }
    ]

    capabilities.forEach(cap => {
      this.capabilities.set(cap.name, cap)
    })
  }

  // Analyze command before execution
  analyzeCommand(command: string): {
    isDestructive: boolean
    needsConfirmation: boolean
    suggestions: string[]
    alternatives: string[]
  } {
    const destructivePatterns = [
      /rm\s+-rf/,
      /git\s+push\s+--force/,
      /DROP\s+DATABASE/i,
      /truncate/i,
      /mkfs/,
      /dd\s+if=/
    ]

    const isDestructive = destructivePatterns.some(pattern => pattern.test(command))
    const suggestions: string[] = []
    const alternatives: string[] = []

    // Provide safer alternatives
    if (command.includes('rm -rf')) {
      suggestions.push('⚠️ This will permanently delete files!')
      alternatives.push('Use: trash <file> (for safer deletion with recovery)')
    }

    if (command.includes('git push --force')) {
      suggestions.push('⚠️ Force push can overwrite others\' work')
      alternatives.push('Use: git push --force-with-lease (safer force push)')
    }

    if (command.match(/npm\s+install\s+(?!-)/)) {
      suggestions.push('💡 Consider using --save or --save-dev')
      alternatives.push('npm install <package> --save')
    }

    return {
      isDestructive,
      needsConfirmation: isDestructive,
      suggestions,
      alternatives
    }
  }

  // Generate AI-powered command suggestions
  async generateCommandSuggestion(
    userIntent: string,
    context: ProjectContext
  ): Promise<string[]> {
    const suggestions: string[] = []

    // Pattern matching for common intents
    if (userIntent.toLowerCase().includes('install')) {
      if (context.dependencies) {
        suggestions.push('npm install')
        suggestions.push('yarn install')
      }
    }

    if (userIntent.toLowerCase().includes('start') || userIntent.toLowerCase().includes('run')) {
      if (context.scripts) {
        Object.keys(context.scripts).forEach(script => {
          suggestions.push(`npm run ${script}`)
        })
      }
    }

    if (userIntent.toLowerCase().includes('git') || userIntent.toLowerCase().includes('commit')) {
      suggestions.push('git status')
      suggestions.push('git add .')
      suggestions.push(`git commit -m "${userIntent}"`)
      suggestions.push('git push')
    }

    if (userIntent.toLowerCase().includes('build')) {
      suggestions.push('npm run build')
      suggestions.push('yarn build')
    }

    return suggestions.slice(0, 5)
  }

  // Detect code smell and suggest improvements
  analyzeCode(code: string): {
    issues: Array<{ line: number; message: string; severity: 'error' | 'warning' | 'info' }>
    suggestions: string[]
  } {
    const issues: Array<{ line: number; message: string; severity: 'error' | 'warning' | 'info' }> = []
    const suggestions: string[] = []
    const lines = code.split('\n')

    lines.forEach((line, index) => {
      // Detect common issues
      if (line.includes('console.log') && !line.includes('//')) {
        issues.push({
          line: index + 1,
          message: 'Consider removing console.log in production',
          severity: 'warning'
        })
      }

      if (line.match(/var\s+\w+/)) {
        issues.push({
          line: index + 1,
          message: 'Use const or let instead of var',
          severity: 'warning'
        })
        suggestions.push('Replace var with const or let for better scoping')
      }

      if (line.includes('==') && !line.includes('===')) {
        issues.push({
          line: index + 1,
          message: 'Use === instead of == for strict equality',
          severity: 'info'
        })
      }
    })

    return { issues, suggestions }
  }

  // Track command execution
  addToCommandBuffer(command: string) {
    this.commandBuffer.push(command)
    if (this.commandBuffer.length > 1000) {
      this.commandBuffer.shift()
    }
  }

  // Get command recommendations based on history
  getCommandRecommendations(): string[] {
    const commandCounts = new Map<string, number>()
    
    this.commandBuffer.forEach(cmd => {
      const base = cmd.split(/\s+/)[0]
      commandCounts.set(base, (commandCounts.get(base) || 0) + 1)
    })

    return Array.from(commandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cmd]) => cmd)
  }

  // Update project context
  updateProjectContext(context: Partial<ProjectContext>) {
    if (!this.projectContext) {
      this.projectContext = {
        rootDir: context.rootDir || process.cwd(),
        files: context.files || [],
        dependencies: context.dependencies || {},
        scripts: context.scripts || {},
        gitBranch: context.gitBranch,
        hasErrors: context.hasErrors || false
      }
    } else {
      this.projectContext = { ...this.projectContext, ...context }
    }
  }

  // Get all capabilities
  getAllCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values())
  }

  // Enable/disable capability
  toggleCapability(name: string, enabled: boolean) {
    const capability = this.capabilities.get(name)
    if (capability) {
      capability.enabled = enabled
      this.capabilities.set(name, capability)
    }
  }
}

// Export singleton
export const enhancedAgent = new EnhancedAgentController()

