'use client'

import type { CommandRecord, TerminalSession, SystemInfo, SessionMetrics } from '../types'

class TerminalSessionTracker {
  private static instance: TerminalSessionTracker
  private currentSession: TerminalSession | null = null
  private commandHistory: CommandRecord[] = []
  private metricsInterval: NodeJS.Timeout | null = null
  private commandStartTimes: Map<string, number> = new Map()

  static getInstance(): TerminalSessionTracker {
    if (!this.instance) {
      this.instance = new TerminalSessionTracker()
    }
    return this.instance
  }

  startSession(sessionId: string, host: string, username: string) {
    // End previous session if exists
    if (this.currentSession) {
      this.endSession()
    }

    this.currentSession = {
      sessionId,
      startTime: new Date(),
      endTime: new Date(),
      host,
      username,
      commands: [],
      systemInfo: {
        os: '',
        kernel: '',
        cpu: '',
        memory: '',
        disk: ''
      },
      metrics: {
        totalCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        averageExecutionTime: 0,
        cpuUsage: [],
        memoryUsage: [],
        diskUsage: []
      }
    }

    this.commandHistory = []
    console.log('📊 Session tracking started:', sessionId)
    this.startMetricsCollection()
  }

  recordCommand(command: string, output: string, exitCode: number = 0, duration: number = 0) {
    if (!this.currentSession) {
      console.warn('⚠️ No active session to record command')
      return
    }

    const record: CommandRecord = {
      command,
      output,
      timestamp: new Date(),
      duration,
      exitCode,
      error: exitCode !== 0 ? output : undefined
    }

    this.commandHistory.push(record)
    this.currentSession.commands.push(record)
    this.currentSession.metrics.totalCommands++
    
    if (exitCode === 0) {
      this.currentSession.metrics.successfulCommands++
    } else {
      this.currentSession.metrics.failedCommands++
    }

    // Update average execution time
    if (this.commandHistory.length > 0) {
      const times = this.commandHistory.map(c => c.duration).filter(d => d > 0)
      if (times.length > 0) {
        this.currentSession.metrics.averageExecutionTime = 
          times.reduce((a, b) => a + b, 0) / times.length
      }
    }

    console.log('📝 Command recorded:', command.slice(0, 50))
  }

  // Track command start for duration calculation
  startCommand(command: string) {
    this.commandStartTimes.set(command, Date.now())
  }

  // Complete command with auto-calculated duration
  completeCommand(command: string, output: string, exitCode: number = 0) {
    const startTime = this.commandStartTimes.get(command)
    const duration = startTime ? Date.now() - startTime : 0
    this.commandStartTimes.delete(command)
    this.recordCommand(command, output, exitCode, duration)
  }

  updateSystemInfo(info: Partial<SystemInfo>) {
    if (this.currentSession) {
      this.currentSession.systemInfo = {
        ...this.currentSession.systemInfo,
        ...info
      }
      console.log('🖥️ System info updated:', Object.keys(info))
    }
  }

  recordMetric(type: 'cpu' | 'memory' | 'disk', value: number) {
    if (!this.currentSession) return

    switch (type) {
      case 'cpu':
        if (!this.currentSession.metrics.cpuUsage) {
          this.currentSession.metrics.cpuUsage = []
        }
        this.currentSession.metrics.cpuUsage.push(value)
        break
      case 'memory':
        if (!this.currentSession.metrics.memoryUsage) {
          this.currentSession.metrics.memoryUsage = []
        }
        this.currentSession.metrics.memoryUsage.push(value)
        break
      case 'disk':
        if (!this.currentSession.metrics.diskUsage) {
          this.currentSession.metrics.diskUsage = []
        }
        this.currentSession.metrics.diskUsage.push(value)
        break
    }
  }

  private startMetricsCollection() {
    // Collect metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      // Placeholder - in production, would parse terminal output for metrics
      // or use actual system monitoring
    }, 10000)
  }

  getSession(): TerminalSession | null {
    if (this.currentSession) {
      return {
        ...this.currentSession,
        endTime: new Date()
      }
    }
    return null
  }

  getCommandCount(): number {
    return this.currentSession?.metrics.totalCommands || 0
  }

  isTracking(): boolean {
    return this.currentSession !== null
  }

  endSession(): TerminalSession | null {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }

    if (this.currentSession) {
      this.currentSession.endTime = new Date()
      const session = { ...this.currentSession }
      console.log('📊 Session ended:', session.sessionId, `(${session.commands.length} commands)`)
      return session
    }

    return null
  }

  reset() {
    this.commandHistory = []
    this.commandStartTimes.clear()
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
    this.currentSession = null
    console.log('🔄 Session tracker reset')
  }
}

export const sessionTracker = TerminalSessionTracker.getInstance()

