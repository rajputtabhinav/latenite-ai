// Cursor-like AI Agent Features
// Advanced capabilities for intelligent terminal assistance

export interface CodeContext {
  currentFile?: string
  openFiles: string[]
  recentCommands: string[]
  workingDirectory: string
  gitBranch?: string
  errors: string[]
}

export interface CommandSuggestion {
  command: string
  description: string
  confidence: number
  category: 'fix' | 'optimization' | 'navigation' | 'analysis'
}

export class CursorLikeAgent {
  private commandHistory: string[] = []
  private errorPatterns: Map<RegExp, string> = new Map()
  private contextCache: CodeContext | null = null

  constructor() {
    // Initialize error patterns for intelligent detection
    this.initializeErrorPatterns()
  }

  private initializeErrorPatterns() {
    this.errorPatterns.set(
      /command not found: (.+)/i,
      'Install missing command: sudo apt install $1 or check spelling'
    )
    this.errorPatterns.set(
      /permission denied/i,
      'Try with sudo or check file permissions'
    )
    this.errorPatterns.set(
      /no such file or directory: (.+)/i,
      'File/directory does not exist. Check path or create it.'
    )
    this.errorPatterns.set(
      /npm ERR!/i,
      'Check package.json, clear cache with: npm cache clean --force'
    )
    this.errorPatterns.set(
      /EADDRINUSE.*:(\d+)/i,
      'Port $1 is in use. Kill process: lsof -ti:$1 | xargs kill -9'
    )
    this.errorPatterns.set(
      /Module not found/i,
      'Missing dependency. Run: npm install or yarn install'
    )
  }

  // Analyze terminal output for errors
  detectErrors(output: string): { hasError: boolean; suggestions: string[] } {
    const suggestions: string[] = []
    
    for (const [pattern, suggestion] of this.errorPatterns) {
      const match = output.match(pattern)
      if (match) {
        let suggestionText = suggestion
        // Replace placeholders with actual matches
        for (let i = 1; i < match.length; i++) {
          suggestionText = suggestionText.replace(`$${i}`, match[i])
        }
        suggestions.push(suggestionText)
      }
    }
    
    return {
      hasError: suggestions.length > 0,
      suggestions
    }
  }

  // Generate context-aware command suggestions
  suggestCommands(context: CodeContext): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = []
    
    // Analyze recent commands for patterns
    const hasNpmInstall = context.recentCommands.some(cmd => cmd.includes('npm install'))
    const hasGitCommands = context.recentCommands.some(cmd => cmd.startsWith('git'))
    
    // Context-aware suggestions
    if (context.errors.length > 0) {
      suggestions.push({
        command: 'npm run build',
        description: 'Rebuild project to clear errors',
        confidence: 0.8,
        category: 'fix'
      })
    }
    
    if (hasNpmInstall && !context.recentCommands.some(cmd => cmd.includes('npm run'))) {
      suggestions.push({
        command: 'npm run dev',
        description: 'Start development server after installation',
        confidence: 0.9,
        category: 'optimization'
      })
    }
    
    if (hasGitCommands && !context.recentCommands.some(cmd => cmd.includes('git status'))) {
      suggestions.push({
        command: 'git status',
        description: 'Check current git status',
        confidence: 0.7,
        category: 'analysis'
      })
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  // Parse command intent for AI assistance
  parseCommandIntent(command: string): {
    action: string
    target?: string
    flags: string[]
    needsHelp: boolean
  } {
    const parts = command.trim().split(/\s+/)
    const action = parts[0] || ''
    const flags = parts.filter(p => p.startsWith('-'))
    const target = parts.find(p => !p.startsWith('-') && p !== action)
    
    // Detect if user might need help
    const helpKeywords = ['help', '--help', '-h', 'man', 'how']
    const needsHelp = helpKeywords.some(kw => command.toLowerCase().includes(kw))
    
    return { action, target, flags, needsHelp }
  }

  // Track command execution for learning
  trackCommand(command: string, success: boolean) {
    this.commandHistory.push(command)
    
    // Keep only last 100 commands
    if (this.commandHistory.length > 100) {
      this.commandHistory.shift()
    }
  }

  // Get command statistics
  getCommandStats() {
    const stats = new Map<string, number>()
    
    this.commandHistory.forEach(cmd => {
      const action = cmd.split(/\s+/)[0]
      stats.set(action, (stats.get(action) || 0) + 1)
    })
    
    return Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cmd, count]) => ({ command: cmd, count }))
  }

  // Update context for better suggestions
  updateContext(context: Partial<CodeContext>) {
    this.contextCache = {
      ...this.contextCache,
      currentFile: context.currentFile || this.contextCache?.currentFile,
      openFiles: context.openFiles || this.contextCache?.openFiles || [],
      recentCommands: context.recentCommands || this.contextCache?.recentCommands || [],
      workingDirectory: context.workingDirectory || this.contextCache?.workingDirectory || '~',
      gitBranch: context.gitBranch || this.contextCache?.gitBranch,
      errors: context.errors || this.contextCache?.errors || []
    }
  }

  // Extract file paths from terminal output
  extractFilePaths(output: string): string[] {
    const pathRegex = /(?:^|\s)([./][\w/.-]+)/g
    const matches = Array.from(output.matchAll(pathRegex))
    return matches.map(m => m[1]).filter(p => p.includes('/') || p.includes('.'))
  }

  // Suggest next likely command
  suggestNextCommand(lastCommand: string, lastOutput: string): string | null {
    // Pattern matching for common workflows
    if (lastCommand.startsWith('git clone')) {
      const dirMatch = lastOutput.match(/Cloning into '(.+)'/);
      if (dirMatch) {
        return `cd ${dirMatch[1]}`
      }
    }
    
    if (lastCommand === 'npm install' || lastCommand === 'yarn install') {
      return 'npm run dev'
    }
    
    if (lastCommand.startsWith('mkdir ')) {
      const dir = lastCommand.replace('mkdir ', '').trim()
      return `cd ${dir}`
    }
    
    if (lastCommand === 'git init') {
      return 'git add .'
    }
    
    if (lastCommand === 'git add .') {
      return 'git commit -m "Initial commit"'
    }
    
    return null
  }
}

// Export singleton instance
export const cursorAgent = new CursorLikeAgent()

