/**
 * Agent Configuration Constants
 * Centralized configuration for Latenite AI Agent
 */

export const AGENT_CONFIG = {
  // UI Configuration
  PANEL_WIDTH: 480,  // Optimal width for readability on desktop
  
  // Agent Behavior
  MAX_ITERATIONS: 15,  // Prevent infinite loops in ReAct execution (increased for complex tasks)
  TYPING_SPEED_MS: 20,  // ChatGPT-like typing animation speed
  MAX_CONTEXT_MESSAGES: 15,  // Memory management - sliding window
  COMMAND_DELAY_MS: 3000,  // Wait time for terminal cleanup before next command
  
  // Terminal Context
  MIN_TERMINAL_LINES: 10,  // Minimum lines to send as context
  MAX_TERMINAL_LINES: 10000,  // Maximum lines to prevent token overflow
  RECENT_LINES_ANALYSIS: 100,  // Lines to analyze for context optimization
  
  // Dynamic Context Thresholds
  ERROR_CONTEXT_LINES: 150,  // Lines to include when error detected
  LARGE_OUTPUT_THRESHOLD: 5000,  // Bytes to consider "large output"
  LARGE_OUTPUT_LINES: 500,  // Lines for large outputs
  MULTILINE_THRESHOLD: 50,  // Lines to consider "multiline"
  MULTILINE_CONTEXT_LINES: 200,  // Lines for multiline outputs
  CODE_CONTEXT_LINES: 300,  // Lines when code detected
  LOG_CONTEXT_LINES: 1000,  // Lines when logs detected
  INTERACTIVE_CONTEXT_LINES: 30,  // Lines for interactive prompts
  JSON_CONTEXT_LINES: 100,  // Lines for JSON output
  TABLE_CONTEXT_LINES: 50,  // Lines for table output
  
  // Timeouts
  COMMAND_TIMEOUT_MS: 30000,  // 30 seconds for command execution
  MEMORY_SAVE_DELAY_MS: 1000,  // Delay before saving to localStorage
  CONVERSATION_PERSIST_INTERVAL_MS: 30000,  // 30 seconds between conversation saves
  
  // Model Configuration
  CONTEXT_WINDOW: 1000000,  // 1M tokens for Claude Sonnet 4.5
  MAX_OUTPUT_TOKENS: 64000,  // Maximum output tokens
  TEMPERATURE: 0.4,  // Optimized for deterministic task execution
  
  // File Upload
  MAX_FILE_SIZE_MB: 10,  // Maximum file size for uploads
  
  // Auto-Reconnect
  MAX_RECONNECT_ATTEMPTS: 3,  // Maximum SSH reconnection attempts
  RECONNECT_DELAY_MS: 2000,  // Delay between reconnection attempts
} as const

export type AgentConfig = typeof AGENT_CONFIG

