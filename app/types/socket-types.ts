import { CommandExecutionResult } from '../lib/agent-terminal-bridge'

// Server -> Client Events
export interface ServerToClientEvents {
    // Terminal events
    'output': (data: string) => void
    'command:sent': (data: { commandId: string, command: string }) => void
    'command:complete': (result: CommandExecutionResult) => void
    'error': (error: string | { message: string }) => void
    'ready': () => void
    'shell-closed': () => void

    // AI events
    'ai:stream': (data: AIStreamData) => void

    // SSH events
    'ssh:data': (data: SSHData) => void
}

// SSH Connection Configuration
export interface SSHConnectionConfig {
    host: string
    port?: number
    username: string
    password?: string
    privateKey?: string
    passphrase?: string
    useKey?: boolean
}

// Client -> Server Events
export interface ClientToServerEvents {
    // Terminal commands
    'input': (data: string) => void
    'resize': (cols: number, rows: number) => void

    // AI commands
    'ai:chat': (data: AIChatPayload) => void

    // SSH commands
    'ssh:connect': (config: SSHConnectionConfig) => void
    'ssh:command': (data: { command: string }) => void
}

// Data Types
export interface AIStreamData {
    type: 'content' | 'done' | 'error'
    content?: string
    error?: string
}

export interface SSHData {
    type: 'output' | 'error'
    data: string
}

export interface AIChatPayload {
    messages: Array<{ role: string, content: string }>
    model: string
    stream: boolean
    webSearchEnabled: boolean
}
