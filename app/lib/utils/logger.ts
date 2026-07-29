// Centralized Logging Utility - Replace console.log spam
// Provides log levels, conditional logging, and structured output

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogConfig {
  enabled: boolean
  level: LogLevel
  prefix?: string
}

const config: LogConfig = {
  enabled: true,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  prefix: '[Latenite]'
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level]
}

function formatMessage(level: LogLevel, message: string, ...args: any[]): string {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
  const emoji = {
    debug: '🔧',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌'
  }[level]
  
  return `${emoji} [${timestamp}] ${config.prefix} ${message}`
}

export const logger = {
  debug(message: string, ...args: any[]) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message), ...args)
    }
  },
  
  info(message: string, ...args: any[]) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args)
    }
  },
  
  warn(message: string, ...args: any[]) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args)
    }
  },
  
  error(message: string, ...args: any[]) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), ...args)
    }
  },
  
  // Agent-specific logging
  agent: {
    reasoning(thought: string) {
      logger.debug(`🧠 AI Reasoning: ${thought}`)
    },
    
    action(action: string) {
      logger.info(`⚡ Action: ${action}`)
    },
    
    observation(output: string) {
      logger.debug(`📊 Observation: ${output.substring(0, 100)}...`)
    },
    
    complete(task: string) {
      logger.info(`✅ Task Complete: ${task}`)
    }
  },
  
  // Terminal-specific logging
  terminal: {
    input(command: string) {
      logger.debug(`📥 Terminal Input: ${command}`)
    },
    
    output(data: string) {
      logger.debug(`📤 Terminal Output: ${data.substring(0, 50)}...`)
    },
    
    connected(sessionId: string) {
      logger.info(`🔌 Terminal Connected: ${sessionId}`)
    },
    
    disconnected() {
      logger.info(`🔌 Terminal Disconnected`)
    }
  },
  
  // SSH-specific logging
  ssh: {
    connecting(host: string) {
      logger.info(`🔐 SSH Connecting to: ${host}`)
    },
    
    connected(host: string) {
      logger.info(`✅ SSH Connected: ${host}`)
    },
    
    error(error: string) {
      logger.error(`❌ SSH Error: ${error}`)
    }
  },
  
  // Performance logging
  perf: {
    start(operation: string): number {
      const start = Date.now()
      logger.debug(`⏱️ Starting: ${operation}`)
      return start
    },
    
    end(operation: string, startTime: number) {
      const duration = Date.now() - startTime
      logger.debug(`⏱️ Completed: ${operation} in ${duration}ms`)
    }
  }
}

// Configuration methods
export const configureLogger = (newConfig: Partial<LogConfig>) => {
  Object.assign(config, newConfig)
}

export const disableLogging = () => {
  config.enabled = false
}

export const enableLogging = () => {
  config.enabled = true
}

export default logger

