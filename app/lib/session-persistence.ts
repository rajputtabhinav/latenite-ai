// Session Persistence & Agent Memory
// Saves and restores SSH connections, agent conversations, and settings

export interface SSHSessionData {
  host: string
  username: string
  sessionId: string
  connectedAt: number
  isConnected: boolean
}

export interface AgentMemory {
  conversations: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
  }>
  settings: {
    selectedModel: string
    isMCPEnabled: boolean
    width: number
    isAutoPilotEnabled: boolean
  }
  commandHistory: string[]
  recentFiles: string[]
  workingDirectory: string
  lastUpdated: number
}

export class SessionPersistence {
  private static readonly SSH_KEY = 'latenite_ssh_session'
  private static readonly AGENT_KEY = 'latenite_agent_memory'
  private static readonly SETTINGS_KEY = 'latenite_settings'

  // Save SSH session
  static saveSSHSession(session: SSHSessionData): void {
    try {
      localStorage.setItem(this.SSH_KEY, JSON.stringify({
        ...session,
        savedAt: Date.now()
      }))
      console.log('💾 SSH session saved')
    } catch (error) {
      console.error('Failed to save SSH session:', error)
    }
  }

  // Restore SSH session
  static restoreSSHSession(): SSHSessionData | null {
    try {
      const saved = localStorage.getItem(this.SSH_KEY)
      if (!saved) return null

      const session = JSON.parse(saved)
      
      // Check if session is less than 2 hours old
      const twoHours = 2 * 60 * 60 * 1000
      if (Date.now() - session.savedAt > twoHours) {
        console.log('⏰ SSH session expired')
        this.clearSSHSession()
        return null
      }

      console.log('✅ SSH session restored')
      return session
    } catch (error) {
      console.error('Failed to restore SSH session:', error)
      return null
    }
  }

  // Clear SSH session
  static clearSSHSession(): void {
    localStorage.removeItem(this.SSH_KEY)
  }

  // Save agent memory
  static saveAgentMemory(memory: AgentMemory): void {
    try {
      localStorage.setItem(this.AGENT_KEY, JSON.stringify({
        ...memory,
        lastUpdated: Date.now()
      }))
      console.log('💾 Agent memory saved:', {
        conversations: memory.conversations.length,
        commands: memory.commandHistory.length
      })
    } catch (error) {
      console.error('Failed to save agent memory:', error)
    }
  }

  // Restore agent memory
  static restoreAgentMemory(): AgentMemory | null {
    try {
      const saved = localStorage.getItem(this.AGENT_KEY)
      if (!saved) return null

      const memory = JSON.parse(saved)
      console.log('✅ Agent memory restored:', {
        conversations: memory.conversations?.length || 0,
        commands: memory.commandHistory?.length || 0
      })
      
      return memory
    } catch (error) {
      console.error('Failed to restore agent memory:', error)
      return null
    }
  }

  // Clear agent memory
  static clearAgentMemory(): void {
    localStorage.removeItem(this.AGENT_KEY)
  }

  // Save settings
  static saveSettings(settings: any): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  // Restore settings
  static restoreSettings(): any | null {
    try {
      const saved = localStorage.getItem(this.SETTINGS_KEY)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('Failed to restore settings:', error)
      return null
    }
  }

  // Clear all
  static clearAll(): void {
    this.clearSSHSession()
    this.clearAgentMemory()
    localStorage.removeItem(this.SETTINGS_KEY)
    console.log('🧹 All session data cleared')
  }
}

// Auto-save utility with debouncing
export class AutoSaver {
  private saveTimeout: NodeJS.Timeout | null = null
  private readonly debounceMs: number

  constructor(debounceMs: number = 1000) {
    this.debounceMs = debounceMs
  }

  save(key: string, data: any): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data))
        console.log(`💾 Auto-saved: ${key}`)
      } catch (error) {
        console.error(`Failed to auto-save ${key}:`, error)
      }
    }, this.debounceMs)
  }

  cancel(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
  }
}

