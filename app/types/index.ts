/**
 * Central TypeScript Type Definitions
 * Eliminates 'any' usage across the codebase
 */

import type { Socket as ClientSocket } from 'socket.io-client'
import type { Socket as ServerSocket } from 'socket.io'
import type { Client } from 'ssh2'

// ============================================================================
// SSH Types
// ============================================================================

export interface SSHCredentials {
  host: string
  username: string
  password?: string
  keyContent?: string
  passphrase?: string
  useKey: boolean
  privateKey?: string
}

export interface SSHConnectionConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string | Buffer
  passphrase?: string
  readyTimeout?: number
  algorithms?: {
    kex?: string[]
    cipher?: string[]
    serverHostKey?: string[]
    hmac?: string[]
  }
}

export interface SSHSession {
  connection: Client
  host: string
  username: string
  connected: boolean
  createdAt: number
  lastActivity: number
  authMethod: 'SSH Key' | 'Password'
  shellReady?: boolean
  keepAlive?: NodeJS.Timeout
  serverAliveInterval?: NodeJS.Timeout
}

export interface SSHConnectionResult {
  success: boolean
  sessionId?: string
  message?: string
  authMethod?: string
  wsURL?: string
  serverInfo?: {
    os: string
    authUsed: string
    host: string
    user: string
    terminalReady: boolean
  }
  needsReconnect?: boolean
  details?: string
  // **NEW: Credentials for auto-reconnect**
  credentials?: {
    host: string
    port: number
    username: string
    password?: string
    privateKey?: string
    passphrase?: string
    authMethod: 'password' | 'key'
  }
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketMessage {
  type: string
  content?: string
  data?: unknown
  sessionId?: string
  commandId?: string
}

export interface TerminalWebSocketData {
  type: 'command' | 'output' | 'status' | 'resize' | 'error'
  content?: string
  sessionId?: string
  output?: string
  error?: string
  cols?: number
  rows?: number
  metadata?: TerminalOutputMetadata
}

export interface TerminalOutputMetadata {
  timestamp: number
  isError?: boolean
  isComplete?: boolean
  hasWarning?: boolean
  commandId?: string
  exitCode?: number
}

// ============================================================================
// Terminal State Types
// ============================================================================

export interface TerminalState {
  isConnected: boolean
  isShellReady: boolean
  currentPath: string
  currentUser: string
  currentHost: string
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'
  lastCommand?: string
  lastOutput?: string[]
  sessionId?: string
}

export interface CommandQueueStats {
  pending: number
  executing: number
  completed: number
  failed: number
}

export interface AgentBridgeStatus {
  isInitialized: boolean
  commandQueue: number
  isProcessing: boolean
  lastSync?: number
  errors?: string[]
}

// ============================================================================
// AI Agent Types
// ============================================================================

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'  // Removed 'system' to match existing usage
  content: string
  timestamp: Date
  type?: 'code' | 'text' | 'react_task'
  isTyping?: boolean
  isStreaming?: boolean
  reactData?: ReactTaskData
  metadata?: MessageMetadata

  // **NEW: Anthropic Web Search support**
  webSearch?: {
    enabled: boolean
    queries: string[]
    resultsCount?: number
  }
  citations?: WebSearchCitation[]
  toolsUsed?: ToolUsage[]
}

export interface WebSearchCitation {
  url: string
  title: string
  snippet?: string
  publishDate?: string
  favicon?: string
}

export interface ToolUsage {
  name: string
  input: any
  timestamp: number
  duration?: number
}

export interface ReactTaskData {
  thinking?: ThinkingStep[]
  currentIteration?: number
  isComplete?: boolean
}

export interface ThinkingStep {
  number: number
  thought: string
  action: string
  observation: string
  status: 'pending' | 'running' | 'complete' | 'error'
  duration?: number
}

export interface MessageMetadata {
  docsAutoFetched?: string[]
  taskId?: string
  hasTimeline?: boolean
  fetchTimestamp?: number
  model?: string
  provider?: string
  tokens?: number
}

export interface AIModel {
  id: string
  name: string
  description: string
  provider: 'anthropic' | 'openai' | 'google' | 'openrouter'
  isDefault?: boolean
  contextWindow: number
  supportsStreaming?: boolean
}

// ============================================================================
// MCP (Model Context Protocol) Types
// ============================================================================

export interface MCPServer {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'error'
  category: string
  tools: MCPTool[]
  resources?: MCPResource[]
  running: boolean
  config?: {
    name?: string
    description?: string
    category?: string
    command?: string
    args?: string[]
    env?: Record<string, string>
    tools?: MCPTool[]
  }
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  category?: string
}

export interface MCPResource {
  uri: string
  name: string
  mimeType?: string
  description?: string
}

export interface MCPInvocationResult {
  success: boolean
  result?: unknown
  error?: string
  serverId?: string
  tool?: string
}

// ============================================================================
// File Processing Types
// ============================================================================

export interface ProcessedFile {
  id: string
  name: string
  type: string
  size: number
  data: string // base64
  extractedText?: string
  preview?: string
  timestamp: Date
  metadata?: FileMetadata
}

export interface FileMetadata {
  sheets?: string[]  // For Excel files
  pages?: number     // For PDFs
  wordCount?: number // For documents
  encoding?: string
}

// ============================================================================
// Command Execution Types
// ============================================================================

export interface CommandResult {
  success: boolean
  output?: string
  error?: string
  exitCode?: number
  duration?: number
  commandId?: string
}

export interface CommandProgress {
  command: string
  status: 'pending' | 'running' | 'complete' | 'error'
  output: string
  duration?: number
  timestamp: number
}

// ============================================================================
// Long-Running Task Types
// ============================================================================

export interface LongRunningTask {
  id: string
  name: string
  description: string
  commands: string[]
  currentStep: number
  totalSteps: number
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  startTime: number
  endTime?: number
  results: TaskStepResult[]
}

export interface TaskStepResult {
  step: number
  command: string
  output: string
  success: boolean
  duration: number
  timestamp: number
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionStats {
  total: number
  active: number
  byType: Record<string, number>
  oldestSession?: number
  newestSession?: number
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface StreamResponse {
  type: 'content' | 'error' | 'done' | 'thinking'
  content?: string
  error?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Documentation Types
// ============================================================================

export interface TerminalSession {
  sessionId: string
  startTime: Date
  endTime: Date
  host: string
  username: string
  commands: CommandRecord[]
  systemInfo: SystemInfo
  metrics: SessionMetrics
}

export interface CommandRecord {
  command: string
  output: string
  timestamp: Date
  duration: number
  exitCode: number
  error?: string
}

export interface SystemInfo {
  os: string
  kernel: string
  cpu: string
  memory: string
  disk: string
}

export interface SessionMetrics {
  totalCommands: number
  successfulCommands: number
  failedCommands: number
  averageExecutionTime: number
  cpuUsage?: number[]
  memoryUsage?: number[]
  diskUsage?: number[]
}

// ============================================================================
// Utility Types
// ============================================================================

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error' | 'disconnected'
export type MCPStatus = 'idle' | 'processing' | 'success' | 'error'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

// Type guards
export function isSSHSession(obj: unknown): obj is SSHSession {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'connection' in obj &&
    'host' in obj &&
    'username' in obj &&
    'connected' in obj
  )
}

export function isAIMessage(obj: unknown): obj is AIMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'role' in obj &&
    'content' in obj &&
    'timestamp' in obj
  )
}

