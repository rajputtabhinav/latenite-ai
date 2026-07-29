/**
 * SSH Credential Manager
 * Securely stores SSH credentials in memory for auto-reconnect
 * Credentials are cleared when session ends or after 4 hours
 * 
 * Security Features:
 * - In-memory only (never written to disk)
 * - Session-scoped
 * - Time-limited (4 hours)
 * - Cleared on disconnect
 */

export interface SavedSSHCredentials {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
  authMethod: 'password' | 'key'
  savedAt: number
  sessionId: string
  expiresAt: number
}

class SSHCredentialManager {
  private static instance: SSHCredentialManager
  private credentials: Map<string, SavedSSHCredentials> = new Map()
  private readonly MAX_AGE = 1000 * 60 * 60 * 4  // 4 hours max
  private cleanupInterval: NodeJS.Timeout

  private constructor() {
    // Auto-cleanup expired credentials every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, 1000 * 60 * 15)
  }

  static getInstance(): SSHCredentialManager {
    if (!this.instance) {
      this.instance = new SSHCredentialManager()
    }
    return this.instance
  }

  /**
   * Save credentials for a session (in-memory only, not disk)
   */
  saveCredentials(
    sessionId: string,
    credentials: Omit<SavedSSHCredentials, 'savedAt' | 'sessionId' | 'expiresAt'>
  ): void {
    const now = Date.now()
    
    const savedCreds: SavedSSHCredentials = {
      ...credentials,
      savedAt: now,
      expiresAt: now + this.MAX_AGE,
      sessionId
    }
    
    this.credentials.set(sessionId, savedCreds)
    
    console.log(`🔐 SSH credentials saved for session ${sessionId}`)
    console.log(`   Host: ${credentials.host}:${credentials.port}`)
    console.log(`   User: ${credentials.username}`)
    console.log(`   Auth: ${credentials.authMethod}`)
    console.log(`   Expires: ${new Date(savedCreds.expiresAt).toLocaleString()}`)
  }

  /**
   * Get credentials for a session
   */
  getCredentials(sessionId: string): SavedSSHCredentials | null {
    const creds = this.credentials.get(sessionId)
    
    if (!creds) {
      console.log(`⚠️ No saved credentials for session ${sessionId}`)
      return null
    }
    
    // Check if expired
    const now = Date.now()
    if (now > creds.expiresAt) {
      const ageMinutes = Math.round((now - creds.savedAt) / 1000 / 60)
      console.log(`⚠️ Credentials expired for session ${sessionId} (${ageMinutes} minutes old)`)
      this.credentials.delete(sessionId)
      return null
    }
    
    console.log(`✅ Retrieved valid credentials for session ${sessionId}`)
    return creds
  }

  /**
   * Check if credentials exist and are valid
   */
  hasCredentials(sessionId: string): boolean {
    const creds = this.credentials.get(sessionId)
    if (!creds) return false
    
    return Date.now() <= creds.expiresAt
  }

  /**
   * Clear credentials for a session
   */
  clearCredentials(sessionId: string): void {
    const hadCreds = this.credentials.has(sessionId)
    this.credentials.delete(sessionId)
    
    if (hadCreds) {
      console.log(`🗑️ Cleared credentials for session ${sessionId}`)
    }
  }

  /**
   * Clear all expired credentials
   */
  cleanupExpired(): void {
    const now = Date.now()
    let cleared = 0
    
    for (const [sessionId, creds] of this.credentials.entries()) {
      if (now > creds.expiresAt) {
        this.credentials.delete(sessionId)
        cleared++
      }
    }
    
    if (cleared > 0) {
      console.log(`🧹 Cleaned up ${cleared} expired credential set(s)`)
    }
  }

  /**
   * Get all saved sessions info (without credentials)
   */
  getSavedSessions(): Array<{ 
    sessionId: string
    host: string
    username: string
    savedAt: number
    expiresAt: number
    authMethod: string
  }> {
    return Array.from(this.credentials.values()).map(c => ({
      sessionId: c.sessionId,
      host: c.host,
      username: c.username,
      savedAt: c.savedAt,
      expiresAt: c.expiresAt,
      authMethod: c.authMethod
    }))
  }

  /**
   * Update session ID (for after reconnect)
   */
  updateSessionId(oldSessionId: string, newSessionId: string): void {
    const creds = this.credentials.get(oldSessionId)
    
    if (creds) {
      this.credentials.delete(oldSessionId)
      creds.sessionId = newSessionId
      this.credentials.set(newSessionId, creds)
      
      console.log(`🔄 Updated session ID: ${oldSessionId} → ${newSessionId}`)
    }
  }

  /**
   * Extend expiration time
   */
  extendExpiration(sessionId: string): void {
    const creds = this.credentials.get(sessionId)
    
    if (creds) {
      creds.expiresAt = Date.now() + this.MAX_AGE
      console.log(`⏰ Extended credentials expiration for ${sessionId}`)
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.credentials.clear()
    console.log('🔒 Credential manager destroyed - all credentials cleared')
  }
}

export const credentialManager = SSHCredentialManager.getInstance()

