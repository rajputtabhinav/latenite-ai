// Multi-Terminal Session Manager
// Handles multiple terminal sessions like Chrome tabs

import { Socket } from 'socket.io-client'

export interface TerminalSession {
  id: string
  title: string
  host?: string
  username?: string
  password?: string
  sessionId?: string
  socket?: Socket | null
  isConnected: boolean
  isShellReady: boolean
  output: string[]
  currentPath: string
  createdAt: number
  lastActivity: number
}

export class MultiTerminalManager {
  private sessions: Map<string, TerminalSession> = new Map()
  private activeSessionId: string | null = null
  private readonly STORAGE_KEY = 'latenite_terminal_sessions'
  private readonly MAX_SESSIONS = 10

  constructor() {
    this.restoreSessions()
  }

  // Create new terminal session
  createSession(title?: string): TerminalSession {
    if (this.sessions.size >= this.MAX_SESSIONS) {
      throw new Error(`Maximum ${this.MAX_SESSIONS} terminals allowed`)
    }

    const id = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const session: TerminalSession = {
      id,
      title: title || `Terminal ${this.sessions.size + 1}`,
      isConnected: false,
      isShellReady: false,
      output: ['🔥 Latenite AI Terminal Ready', ''],
      currentPath: '~',
      createdAt: Date.now(),
      lastActivity: Date.now()
    }

    this.sessions.set(id, session)
    this.activeSessionId = id
    this.saveSessions()

    console.log(`📝 Created terminal session: ${id}`)
    return session
  }

  // Get session by ID
  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id)
  }

  // Get active session
  getActiveSession(): TerminalSession | undefined {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) : undefined
  }

  // Set active session
  setActiveSession(id: string): boolean {
    if (this.sessions.has(id)) {
      this.activeSessionId = id
      this.saveSessions()
      return true
    }
    return false
  }

  // Update session
  updateSession(id: string, updates: Partial<TerminalSession>): void {
    const session = this.sessions.get(id)
    if (session) {
      Object.assign(session, updates, { lastActivity: Date.now() })
      this.saveSessions()
    }
  }

  // Close session
  closeSession(id: string): boolean {
    const session = this.sessions.get(id)
    
    // Disconnect socket if connected
    if (session?.socket) {
      session.socket.disconnect()
    }

    this.sessions.delete(id)

    // If closing active session, switch to another
    if (this.activeSessionId === id) {
      const remaining = Array.from(this.sessions.keys())
      this.activeSessionId = remaining.length > 0 ? remaining[0] : null
    }

    this.saveSessions()
    console.log(`🗑️ Closed terminal session: ${id}`)
    return true
  }

  // Get all sessions
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  // Get session count
  getSessionCount(): number {
    return this.sessions.size
  }

  // Save sessions to localStorage
  private saveSessions(): void {
    try {
      const sessionsData = Array.from(this.sessions.values()).map(session => ({
        id: session.id,
        title: session.title,
        host: session.host,
        username: session.username,
        sessionId: session.sessionId,
        isConnected: session.isConnected,
        currentPath: session.currentPath,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        // Don't save: socket, output (too large), password (security)
      }))

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        sessions: sessionsData,
        activeSessionId: this.activeSessionId,
        savedAt: Date.now()
      }))
    } catch (error) {
      console.error('Failed to save terminal sessions:', error)
    }
  }

  // Restore sessions from localStorage
  private restoreSessions(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (!saved) {
        // Create default session
        this.createSession('Terminal 1')
        return
      }

      const data = JSON.parse(saved)
      
      // Restore sessions (without reconnecting)
      data.sessions?.forEach((sessionData: any) => {
        const session: TerminalSession = {
          ...sessionData,
          socket: null,
          isConnected: false, // Don't auto-reconnect (security)
          isShellReady: false,
          output: ['🔥 Latenite AI Terminal Ready', '']
        }
        this.sessions.set(session.id, session)
      })

      // Restore active session
      if (data.activeSessionId && this.sessions.has(data.activeSessionId)) {
        this.activeSessionId = data.activeSessionId
      } else if (this.sessions.size > 0) {
        this.activeSessionId = Array.from(this.sessions.keys())[0]
      }

      console.log(`✅ Restored ${this.sessions.size} terminal sessions`)

      // Create default if none exist
      if (this.sessions.size === 0) {
        this.createSession('Terminal 1')
      }
    } catch (error) {
      console.error('Failed to restore terminal sessions:', error)
      // Create default session on error
      this.createSession('Terminal 1')
    }
  }

  // Clean up old sessions (> 24 hours)
  cleanupOldSessions(): number {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    let cleaned = 0

    this.sessions.forEach((session, id) => {
      if (session.lastActivity < oneDayAgo && !session.isConnected) {
        this.closeSession(id)
        cleaned++
      }
    })

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old terminal sessions`)
    }

    return cleaned
  }

  // Get session statistics
  getStats(): {
    total: number
    connected: number
    disconnected: number
    oldestSession: number
    newestSession: number
  } {
    const sessions = this.getAllSessions()
    return {
      total: sessions.length,
      connected: sessions.filter(s => s.isConnected).length,
      disconnected: sessions.filter(s => !s.isConnected).length,
      oldestSession: Math.min(...sessions.map(s => s.createdAt)),
      newestSession: Math.max(...sessions.map(s => s.createdAt))
    }
  }
}

// Export singleton instance
export const terminalManager = new MultiTerminalManager()

