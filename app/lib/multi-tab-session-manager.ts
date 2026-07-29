/**
 * Multi-Tab Session Manager
 * Manages SSH sessions across multiple browser tabs
 * Allows users to choose between reusing existing sessions or creating new ones
 * 
 * Features:
 * - Cross-tab session detection
 * - Session sharing option
 * - Independent sessions option
 * - Auto-cleanup on tab close
 * - Stale session removal
 */

export interface SharedSession {
  sessionId: string
  host: string
  username: string
  connected: boolean
  createdAt: number
  lastActivity: number
  tabId: string
  tabName: string
  isActive: boolean
}

class MultiTabSessionManager {
  private static instance: MultiTabSessionManager
  private currentTabId: string
  private currentTabName: string
  private readonly STORAGE_KEY = 'latenite_active_ssh_sessions'
  private readonly SESSION_TIMEOUT = 600000  // 10 minutes of inactivity

  /**
   * Check if we're in browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  }

  private constructor() {
    // Generate unique tab ID
    this.currentTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.currentTabName = `Tab ${new Date().toLocaleTimeString()}`
    
    console.log(`📊 Multi-tab manager initialized for ${this.currentTabId}`)
    
    // Only run client-side code in browser
    if (typeof window !== 'undefined') {
      // Listen for session changes from other tabs
      window.addEventListener('storage', this.handleStorageChange.bind(this))
      
      // Cleanup on tab close
      window.addEventListener('beforeunload', () => {
        this.markTabClosed()
      })
      
      // Update activity periodically
      setInterval(() => {
        this.updateActivity()
      }, 30000)  // Every 30 seconds
    }
    
    // Cleanup stale sessions
    setInterval(() => {
      this.cleanupStaleSessions()
    }, 60000)  // Every minute
  }

  static getInstance(): MultiTabSessionManager {
    if (!this.instance) {
      this.instance = new MultiTabSessionManager()
    }
    return this.instance
  }

  /**
   * Get all active sessions from localStorage
   */
  getActiveSessions(): SharedSession[] {
    // Only run in browser
    if (!this.isBrowser()) return []
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const sessions: SharedSession[] = JSON.parse(stored)
      
      // Filter out stale sessions
      const now = Date.now()
      const active = sessions.filter(s => 
        s.isActive && (now - s.lastActivity) < this.SESSION_TIMEOUT
      )
      
      // Update storage if we filtered any
      if (active.length !== sessions.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(active))
        console.log(`🧹 Cleaned up ${sessions.length - active.length} stale session(s)`)
      }
      
      return active
    } catch (error) {
      console.error('❌ Failed to get active sessions:', error)
      return []
    }
  }

  /**
   * Get sessions from OTHER tabs (not current tab)
   */
  getOtherTabSessions(): SharedSession[] {
    const sessions = this.getActiveSessions()
    const others = sessions.filter(s => s.tabId !== this.currentTabId)
    
    if (others.length > 0) {
      console.log(`📊 Found ${others.length} SSH session(s) in other tab(s):`)
      others.forEach(s => {
        console.log(`   • ${s.username}@${s.host} (${s.tabName})`)
      })
    }
    
    return others
  }

  /**
   * Register current tab's SSH session
   */
  registerSession(sessionId: string, host: string, username: string): void {
    const sessions = this.getActiveSessions()
    
    // Remove any existing session for this tab
    const filtered = sessions.filter(s => s.tabId !== this.currentTabId)
    
    // Add new session for current tab
    const newSession: SharedSession = {
      sessionId,
      host,
      username,
      connected: true,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      tabId: this.currentTabId,
      tabName: this.currentTabName,
      isActive: true
    }
    
    filtered.push(newSession)
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      console.log(`✅ SSH session registered for ${this.currentTabName}`)
      console.log(`   Session: ${sessionId}`)
      console.log(`   Host: ${username}@${host}`)
    } catch (error) {
      console.error('❌ Failed to register session:', error)
    }
  }

  /**
   * Update activity timestamp for current tab's session
   */
  updateActivity(): void {
    const sessions = this.getActiveSessions()
    const updated = sessions.map(s => 
      s.tabId === this.currentTabId 
        ? { ...s, lastActivity: Date.now() } 
        : s
    )
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update activity:', error)
    }
  }

  /**
   * Mark current tab's session as disconnected
   */
  markSessionDisconnected(): void {
    const sessions = this.getActiveSessions()
    const updated = sessions.map(s => 
      s.tabId === this.currentTabId 
        ? { ...s, connected: false, isActive: false } 
        : s
    )
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated))
      console.log(`🔌 Session disconnected for ${this.currentTabName}`)
    } catch (error) {
      console.error('Failed to mark disconnected:', error)
    }
  }

  /**
   * Remove current tab's session on close
   */
  markTabClosed(): void {
    const sessions = this.getActiveSessions()
    const filtered = sessions.filter(s => s.tabId !== this.currentTabId)
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      console.log(`🗑️ ${this.currentTabName} closed, session removed`)
    } catch (error) {
      console.error('Failed to remove session:', error)
    }
  }

  /**
   * Cleanup sessions that haven't been active recently
   */
  cleanupStaleSessions(): void {
    const now = Date.now()
    const sessions = this.getActiveSessions()
    const active = sessions.filter(s => (now - s.lastActivity) < this.SESSION_TIMEOUT)
    
    if (active.length !== sessions.length) {
      const removed = sessions.length - active.length
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(active))
      console.log(`🧹 Cleaned up ${removed} stale session(s)`)
    }
  }

  /**
   * Check if another tab has active SSH connections
   */
  hasOtherActiveConnections(): boolean {
    return this.getOtherTabSessions().length > 0
  }

  /**
   * Get current tab ID
   */
  getCurrentTabId(): string {
    return this.currentTabId
  }

  /**
   * Get current tab name
   */
  getCurrentTabName(): string {
    return this.currentTabName
  }

  /**
   * Get session count across all tabs
   */
  getTotalSessionCount(): number {
    return this.getActiveSessions().length
  }

  /**
   * Check if a specific session exists
   */
  hasSession(sessionId: string): boolean {
    return this.getActiveSessions().some(s => s.sessionId === sessionId)
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SharedSession | null {
    return this.getActiveSessions().find(s => s.sessionId === sessionId) || null
  }

  /**
   * Handle storage change events from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (!this.isBrowser()) return
    
    if (event.key === this.STORAGE_KEY) {
      console.log('📡 SSH sessions changed in another tab')
      
      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('ssh-sessions-changed', {
        detail: { sessions: this.getActiveSessions() }
      }))
    }
  }

  /**
   * Clear all sessions (for testing/debugging)
   */
  clearAllSessions(): void {
    if (!this.isBrowser()) return
    
    localStorage.removeItem(this.STORAGE_KEY)
    console.log('🗑️ Cleared all SSH sessions from storage')
  }
}

export const multiTabSessionManager = MultiTabSessionManager.getInstance()

