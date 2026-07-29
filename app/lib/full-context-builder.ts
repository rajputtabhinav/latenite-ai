// Server-side only - removed 'use client'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { QdrantClient } from '@qdrant/js-client-rest'

const execAsync = promisify(exec)

export interface FullContext {
  terminal: {
    history: string
    currentPath: string
    lastCommand: string
  }
  workspace: {
    fileTree: string
    totalFiles: number
    projectRoot: string
  }
  git: {
    branch: string
    status: string
    recentCommits: string
    uncommittedChanges: string[]
  }
  embeddings: {
    relevantCode: Array<{
      file: string
      content: string
      score: number
    }>
  }
  conversation: {
    messageCount: number
    summary: string
  }
  system: {
    os: string
    nodeVersion: string
    availableMemory: string
  }
}

export class FullContextBuilder {
  private qdrantClient: QdrantClient | null = null
  private workspaceRoot: string

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || process.cwd()
    
    // Initialize Qdrant client
    try {
      this.qdrantClient = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333'
      })
    } catch (error) {
      console.error('Failed to initialize Qdrant client:', error)
    }
  }

  /**
   * Build complete context - ALL available information
   * Uses 1M token context window efficiently
   */
  async buildFullContext(params: {
    task: string
    terminalHistory: string[]
    messages?: Array<{ role: string; content: string }>
  }): Promise<FullContext> {
    // Run all context gathering in parallel for maximum speed
    const [terminal, workspace, git, embeddings, system] = await Promise.all([
      this.getTerminalContext(params.terminalHistory),
      this.getWorkspaceContext(),
      this.getGitContext(),
      this.getRelevantCodeEmbeddings(params.task),
      this.getSystemContext()
    ])

    const conversation = this.getConversationContext(params.messages || [])

    return {
      terminal,
      workspace,
      git,
      embeddings,
      conversation,
      system
    }
  }

  /**
   * Get full terminal context - ALL history
   */
  private async getTerminalContext(terminalHistory: string[]): Promise<FullContext['terminal']> {
    const fullHistory = terminalHistory.join('\n')
    const lastCommand = terminalHistory[terminalHistory.length - 1] || ''
    
    // Extract current path from terminal output
    let currentPath = this.workspaceRoot
    const pathMatch = fullHistory.match(/(?:^|\n)([^$\n]+)\$[^\n]*$/m)
    if (pathMatch) {
      const pathPart = pathMatch[1].split(':')[1]
      if (pathPart) currentPath = pathPart.trim()
    }

    return {
      history: fullHistory,
      currentPath,
      lastCommand
    }
  }

  /**
   * Get workspace file tree - complete project structure
   */
  private async getWorkspaceContext(): Promise<FullContext['workspace']> {
    try {
      const fileTree = await this.generateFileTree(this.workspaceRoot)
      const fileCount = this.countFiles(fileTree)

      return {
        fileTree,
        totalFiles: fileCount,
        projectRoot: this.workspaceRoot
      }
    } catch (error) {
      console.error('Failed to get workspace context:', error)
      return {
        fileTree: 'Unable to read workspace structure',
        totalFiles: 0,
        projectRoot: this.workspaceRoot
      }
    }
  }

  /**
   * Generate file tree recursively
   */
  private async generateFileTree(dirPath: string, prefix: string = '', maxDepth: number = 4, currentDepth: number = 0): Promise<string> {
    if (currentDepth >= maxDepth) return ''

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      // Filter out node_modules, .git, .next, etc.
      const filtered = entries.filter(entry => 
        !['node_modules', '.git', '.next', 'dist', 'build', '.cursor'].includes(entry.name)
      )

      let tree = ''
      for (let i = 0; i < filtered.length; i++) {
        const entry = filtered[i]
        const isLast = i === filtered.length - 1
        const connector = isLast ? '└── ' : '├── '
        const newPrefix = isLast ? '    ' : '│   '

        tree += `${prefix}${connector}${entry.name}\n`

        if (entry.isDirectory()) {
          const subTree = await this.generateFileTree(
            path.join(dirPath, entry.name),
            prefix + newPrefix,
            maxDepth,
            currentDepth + 1
          )
          tree += subTree
        }
      }

      return tree
    } catch (error) {
      return ''
    }
  }

  /**
   * Count total files in tree
   */
  private countFiles(tree: string): number {
    return (tree.match(/├──|└──/g) || []).length
  }

  /**
   * Get Git status, branch, and recent commits
   */
  private async getGitContext(): Promise<FullContext['git']> {
    try {
      const [branch, status, log, diff] = await Promise.all([
        execAsync('git branch --show-current', { cwd: this.workspaceRoot }).then(r => r.stdout.trim()).catch(() => 'unknown'),
        execAsync('git status --short', { cwd: this.workspaceRoot }).then(r => r.stdout.trim()).catch(() => 'Not a git repository'),
        execAsync('git log --oneline -10', { cwd: this.workspaceRoot }).then(r => r.stdout.trim()).catch(() => 'No commits'),
        execAsync('git diff --name-only', { cwd: this.workspaceRoot }).then(r => r.stdout.trim()).catch(() => '')
      ])

      const uncommittedChanges = diff.split('\n').filter(Boolean)

      return {
        branch,
        status,
        recentCommits: log,
        uncommittedChanges
      }
    } catch (error) {
      return {
        branch: 'unknown',
        status: 'Git not available',
        recentCommits: '',
        uncommittedChanges: []
      }
    }
  }

  /**
   * Query Qdrant for relevant code embeddings
   */
  private async getRelevantCodeEmbeddings(task: string): Promise<FullContext['embeddings']> {
    if (!this.qdrantClient) {
      return { relevantCode: [] }
    }

    try {
      // Generate embedding for the task
      const embeddingResponse = await fetch(`${process.env.OPENAI_API_URL || 'https://api.openai.com/v1'}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-large',
          input: task
        })
      })

      if (!embeddingResponse.ok) {
        throw new Error('Failed to generate embedding')
      }

      const embeddingData = await embeddingResponse.json()
      const embedding = embeddingData.data[0].embedding

      // Search Qdrant for similar code
      const searchResults = await this.qdrantClient.search('latenite-codebase', {
        vector: embedding,
        limit: 10,
        with_payload: true
      })

      const relevantCode = searchResults.map(result => ({
        file: (result.payload?.file as string) || 'unknown',
        content: (result.payload?.content as string) || '',
        score: result.score || 0
      }))

      return { relevantCode }
    } catch (error) {
      console.error('Failed to query Qdrant:', error)
      return { relevantCode: [] }
    }
  }

  /**
   * Get conversation context summary
   */
  private getConversationContext(messages: Array<{ role: string; content: string }>): FullContext['conversation'] {
    const messageCount = messages.length

    // Create a smart summary of the conversation
    let summary = ''
    if (messageCount === 0) {
      summary = 'New conversation - no history'
    } else if (messageCount <= 10) {
      summary = 'Recent conversation - full context available'
    } else {
      // Summarize older messages, keep recent ones
      const recentCount = 10
      const olderCount = messageCount - recentCount
      summary = `Conversation has ${messageCount} messages. ${olderCount} older messages available for reference.`
    }

    return {
      messageCount,
      summary
    }
  }

  /**
   * Get system information
   */
  private async getSystemContext(): Promise<FullContext['system']> {
    try {
      const [nodeVersion, memInfo] = await Promise.all([
        execAsync('node --version').then(r => r.stdout.trim()).catch(() => 'unknown'),
        this.getMemoryInfo()
      ])

      return {
        os: process.platform,
        nodeVersion,
        availableMemory: memInfo
      }
    } catch (error) {
      return {
        os: process.platform,
        nodeVersion: 'unknown',
        availableMemory: 'unknown'
      }
    }
  }

  /**
   * Get memory information
   */
  private async getMemoryInfo(): Promise<string> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value')
        const freeMatch = stdout.match(/FreePhysicalMemory=(\d+)/)
        const totalMatch = stdout.match(/TotalVisibleMemorySize=(\d+)/)
        
        if (freeMatch && totalMatch) {
          const freeGB = (parseInt(freeMatch[1]) / 1024 / 1024).toFixed(2)
          const totalGB = (parseInt(totalMatch[1]) / 1024 / 1024).toFixed(2)
          return `${freeGB}GB free of ${totalGB}GB`
        }
      } else {
        const { stdout } = await execAsync('free -h')
        const memLine = stdout.split('\n')[1]
        if (memLine) {
          const parts = memLine.split(/\s+/)
          return `${parts[3]} free of ${parts[1]}`
        }
      }
      return 'unknown'
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Format context for prompt - optimized for 1M token window
   */
  formatForPrompt(context: FullContext): string {
    return `
## COMPLETE SYSTEM CONTEXT (1M Token Window Utilized)

### Terminal State
Current Path: ${context.terminal.currentPath}
Last Command: ${context.terminal.lastCommand}
Full History:
\`\`\`
${context.terminal.history}
\`\`\`

### Workspace Structure
Project Root: ${context.workspace.projectRoot}
Total Files: ${context.workspace.totalFiles}
File Tree:
\`\`\`
${context.workspace.fileTree}
\`\`\`

### Git Status
Branch: ${context.git.branch}
Status:
\`\`\`
${context.git.status}
\`\`\`
Recent Commits:
\`\`\`
${context.git.recentCommits}
\`\`\`
Uncommitted Changes: ${context.git.uncommittedChanges.join(', ') || 'None'}

### Relevant Code Context (Semantic Search)
${context.embeddings.relevantCode.map((code, i) => `
File ${i + 1}: ${code.file} (relevance: ${(code.score * 100).toFixed(1)}%)
\`\`\`
${code.content.slice(0, 500)}${code.content.length > 500 ? '...' : ''}
\`\`\`
`).join('\n')}

### Conversation Context
Messages: ${context.conversation.messageCount}
Summary: ${context.conversation.summary}

### System Information
OS: ${context.system.os}
Node: ${context.system.nodeVersion}
Memory: ${context.system.availableMemory}
`.trim()
  }
}
