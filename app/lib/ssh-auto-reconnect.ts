/**
 * SSH Auto-Reconnect Service
 * Handles automatic SSH reconnection after server reboots
 * 
 * Features:
 * - 10 minute retry window
 * - 30 second intervals
 * - 20 maximum attempts
 * - Progress tracking
 * - Task queue for post-reboot continuation
 */

import { credentialManager, SavedSSHCredentials } from './ssh-credential-manager'
import type { Socket } from 'socket.io-client'

export interface ReconnectTask {
  taskDescription: string
  pendingCommands: string[]
  context: string
  savedAt: number
}

export interface ReconnectProgress {
  attempt: number
  maxAttempts: number
  elapsedTime: number
  maxDuration: number
  nextRetryIn: number
  status: 'waiting' | 'connecting' | 'connected' | 'failed'
  message: string
}

class SSHAutoReconnect {
  private static instance: SSHAutoReconnect
  private pendingTasks: Map<string, ReconnectTask> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  
  // **TIMING CONFIGURATION: 10 minutes with 30-second intervals**
  private readonly INITIAL_WAIT = 45000        // 45 seconds (let server start shutdown)
  private readonly RETRY_INTERVAL = 30000      // 30 seconds between attempts
  private readonly MAX_DURATION = 600000       // 10 minutes total
  private readonly MAX_ATTEMPTS = 20           // 20 attempts (10 min / 30s)

  static getInstance(): SSHAutoReconnect {
    if (!this.instance) {
      this.instance = new SSHAutoReconnect()
    }
    return this.instance
  }

  /**
   * Detect if command will cause SSH disconnect
   */
  isRebootCommand(command: string): boolean {
    const trimmed = command.trim().toLowerCase()
    
    const rebootPatterns = [
      /sudo\s+reboot/,
      /shutdown\s+-r/,
      /systemctl\s+reboot/,
      /init\s+6/,
      /reboot\s+now/,
      /restart\s+(system|server)/
    ]
    
    const isReboot = rebootPatterns.some(pattern => pattern.test(trimmed))
    
    if (isReboot) {
      console.log(`🔄 Reboot command detected: "${command}"`)
    }
    
    return isReboot
  }

  /**
   * Save task before reboot
   */
  saveTaskBeforeReboot(
    sessionId: string,
    taskDescription: string,
    pendingCommands: string[],
    context: string
  ): void {
    this.pendingTasks.set(sessionId, {
      taskDescription,
      pendingCommands,
      context,
      savedAt: Date.now()
    })
    
    console.log(`💾 Task saved before reboot for session ${sessionId}`)
    console.log(`   Task: ${taskDescription}`)
    console.log(`   Pending commands: ${pendingCommands.length}`)
  }

  /**
   * Auto-reconnect after reboot with 10-minute retry window
   */
  async attemptReconnect(
    sessionId: string,
    socket: Socket,
    onProgress: (progress: ReconnectProgress) => void,
    onSuccess: (newSessionId: string) => void,
    onFailed: (error: string) => void
  ): Promise<void> {
    const credentials = credentialManager.getCredentials(sessionId)
    
    if (!credentials) {
      onFailed('No saved credentials for auto-reconnect')
      return
    }
    
    const startTime = Date.now()
    let currentAttempt = 0
    
    console.log(`🔄 Starting auto-reconnect sequence`)
    console.log(`   Max duration: ${this.MAX_DURATION/1000}s (${this.MAX_DURATION/60000} minutes)`)
    console.log(`   Retry interval: ${this.RETRY_INTERVAL/1000}s`)
    console.log(`   Max attempts: ${this.MAX_ATTEMPTS}`)
    console.log(`   Initial wait: ${this.INITIAL_WAIT/1000}s`)
    
    // Initial wait for server to start shutdown
    console.log(`⏱️ Waiting ${this.INITIAL_WAIT/1000}s for server to begin reboot...`)
    
    onProgress({
      attempt: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      elapsedTime: 0,
      maxDuration: this.MAX_DURATION,
      nextRetryIn: this.INITIAL_WAIT,
      status: 'waiting',
      message: 'Server is rebooting... waiting for shutdown to complete'
    })
    
    await new Promise(resolve => setTimeout(resolve, this.INITIAL_WAIT))
    
    // Retry loop
    const attemptConnection = async (): Promise<boolean> => {
      currentAttempt++
      const elapsedTime = Date.now() - startTime
      
      // Check if we've exceeded max duration
      if (elapsedTime > this.MAX_DURATION) {
        console.log(`⏰ Max duration reached (${this.MAX_DURATION/60000} minutes)`)
        onFailed(`Could not reconnect within ${this.MAX_DURATION/60000} minutes`)
        return false
      }
      
      // Check if we've exceeded max attempts
      if (currentAttempt > this.MAX_ATTEMPTS) {
        console.log(`⚠️ Max attempts reached (${this.MAX_ATTEMPTS})`)
        onFailed(`Failed after ${this.MAX_ATTEMPTS} attempts`)
        return false
      }
      
      const remainingTime = this.MAX_DURATION - elapsedTime
      
      console.log(`🔌 Reconnect attempt ${currentAttempt}/${this.MAX_ATTEMPTS}`)
      console.log(`   Time elapsed: ${Math.round(elapsedTime/1000)}s`)
      console.log(`   Time remaining: ${Math.round(remainingTime/1000)}s`)
      
      onProgress({
        attempt: currentAttempt,
        maxAttempts: this.MAX_ATTEMPTS,
        elapsedTime,
        maxDuration: this.MAX_DURATION,
        nextRetryIn: this.RETRY_INTERVAL,
        status: 'connecting',
        message: `Attempting to connect to ${credentials.host}...`
      })
      
      try {
        const connected = await this.tryConnect(sessionId, credentials, socket)
        
        if (connected) {
          return true  // Success!
        }
        
        // Failed - schedule retry
        console.log(`❌ Attempt ${currentAttempt} failed, retrying in ${this.RETRY_INTERVAL/1000}s...`)
        
        onProgress({
          attempt: currentAttempt,
          maxAttempts: this.MAX_ATTEMPTS,
          elapsedTime: Date.now() - startTime,
          maxDuration: this.MAX_DURATION,
          nextRetryIn: this.RETRY_INTERVAL,
          status: 'waiting',
          message: 'Connection failed, will retry...'
        })
        
        await new Promise(resolve => setTimeout(resolve, this.RETRY_INTERVAL))
        
        // Recursive retry
        return attemptConnection()
        
      } catch (error) {
        console.error(`❌ Connection attempt ${currentAttempt} error:`, error)
        
        // Continue retrying unless max reached
        if (currentAttempt < this.MAX_ATTEMPTS && Date.now() - startTime < this.MAX_DURATION) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_INTERVAL))
          return attemptConnection()
        } else {
          onFailed(error instanceof Error ? error.message : 'Connection failed')
          return false
        }
      }
    }
    
    // Start the retry loop
    const success = await attemptConnection()
    
    if (!success) {
      this.reconnectAttempts.delete(sessionId)
    }
  }

  /**
   * Try a single connection attempt
   */
  private tryConnect(
    sessionId: string,
    credentials: SavedSSHCredentials,
    socket: Socket
  ): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`🔌 Connecting to ${credentials.username}@${credentials.host}:${credentials.port}...`)
      
      const timeout = setTimeout(() => {
        console.log('⏰ Connection timeout')
        resolve(false)
      }, 15000)  // 15 second timeout per attempt
      
      socket.emit('ssh:auto-reconnect', {
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        passphrase: credentials.passphrase,
        originalSessionId: sessionId
      }, (response: any) => {
        clearTimeout(timeout)
        
        if (response.success) {
          console.log(`✅ SSH reconnected! New session: ${response.sessionId}`)
          
          // Update credential manager with new session ID
          credentialManager.updateSessionId(sessionId, response.sessionId)
          
          // Move pending task to new session
          const task = this.pendingTasks.get(sessionId)
          if (task) {
            this.pendingTasks.set(response.sessionId, task)
            this.pendingTasks.delete(sessionId)
            console.log(`💾 Task transferred to new session ${response.sessionId}`)
          }
          
          this.reconnectAttempts.delete(sessionId)
          resolve(true)
        } else {
          console.log(`❌ Connection failed: ${response.error}`)
          resolve(false)
        }
      })
    })
  }

  /**
   * Get pending task after reconnect
   */
  getPendingTask(sessionId: string): ReconnectTask | null {
    return this.pendingTasks.get(sessionId) || null
  }

  /**
   * Clear pending task
   */
  clearPendingTask(sessionId: string): void {
    this.pendingTasks.delete(sessionId)
    this.reconnectAttempts.delete(sessionId)
    console.log(`🗑️ Cleared pending task for session ${sessionId}`)
  }

  /**
   * Cancel ongoing reconnection
   */
  cancelReconnect(sessionId: string): void {
    const timer = this.reconnectTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(sessionId)
    }
    
    this.reconnectAttempts.delete(sessionId)
    console.log(`🛑 Cancelled auto-reconnect for session ${sessionId}`)
  }

  /**
   * Get current attempt count
   */
  getAttemptCount(sessionId: string): number {
    return this.reconnectAttempts.get(sessionId) || 0
  }
}

export const autoReconnect = SSHAutoReconnect.getInstance()

