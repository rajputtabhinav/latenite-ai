/**
 * UNIFIED LATENITE AI AGENT PROMPT SYSTEM
 * Inspired by Cline's modular architecture
 * Single source of truth for all agent prompts
 * 
 * Architecture:
 * - Component-based prompt building
 * - Context-aware prompt generation
 * - Mode-specific variants (chat, react, cursor)
 * - Optimized for Claude Sonnet 4.5 with 1M context
 */

import {
  AGENT_IDENTITY,
  CAPABILITIES,
  RULES,
  OBJECTIVE,
  TOOLS_DOCUMENTATION,
  SYSTEM_INFO_TEMPLATE,
  DEVELOPER_CREDIT
} from './common'

import { CHAT_MODE_INSTRUCTIONS } from './chat-prompt'
import { REACT_MODE_INSTRUCTIONS } from './react-prompt'
import { CURSOR_MODE_INSTRUCTIONS } from './cursor-prompt'

// ============================================================================
// PROMPT BUILDER FUNCTIONS
// ============================================================================

export interface PromptContext {
  mode: 'chat' | 'react' | 'cursor'
  cwd?: string
  osType?: string
  shellType?: string
  sshConnected?: boolean
  mcpEnabled?: boolean
  webSearchEnabled?: boolean
  browserSupport?: boolean
  terminalContext?: string
  taskDescription?: string
  historyContext?: string
  iteration?: number
  cursorMode?: 'completion' | 'edit' | 'agent' | 'ask' | 'terminal' | 'debug' | 'quick_question'
}

/**
 * Build complete system prompt based on context
 */
export function buildUnifiedPrompt(context: PromptContext): string {
  const sections: string[] = []

  // 1. Agent Identity
  sections.push(AGENT_IDENTITY)
  sections.push('')

  // 2. Capabilities
  sections.push(CAPABILITIES)
  sections.push('')

  // 3. Rules
  const rules = RULES
    .replace(/\{\{CWD\}\}/g, context.cwd || process.cwd())
  sections.push(rules)
  sections.push('')

  // 4. Objective
  sections.push(OBJECTIVE)
  sections.push('')

  // 5. Mode-specific instructions
  if (context.mode === 'chat') {
    sections.push(CHAT_MODE_INSTRUCTIONS)
  } else if (context.mode === 'react') {
    sections.push(REACT_MODE_INSTRUCTIONS)

    // Add task context for ReAct mode
    if (context.taskDescription) {
      sections.push('')
      sections.push(`## CURRENT TASK`)
      sections.push(`**Your mission:** ${context.taskDescription}`)
      sections.push('')
      sections.push(`**Terminal Context (Last 500 chars):**`)
      sections.push('```')
      sections.push(context.terminalContext || '(No terminal output yet)')
      sections.push('```')

      if (context.historyContext) {
        sections.push('')
        sections.push(`**Execution History:**`)
        sections.push(context.historyContext)
      }

      if (context.iteration) {
        sections.push('')
        sections.push(`**Iteration:** ${context.iteration}`)
      }
    }
  } else if (context.mode === 'cursor') {
    sections.push(CURSOR_MODE_INSTRUCTIONS)
  }
  sections.push('')

  // 6. Tools documentation
  sections.push(TOOLS_DOCUMENTATION)
  sections.push('')

  // 7. System information
  const sysInfo = SYSTEM_INFO_TEMPLATE
    .replace('{{OS_TYPE}}', context.osType || 'Auto-detected')
    .replace('{{SHELL_TYPE}}', context.shellType || 'Auto-detected')
    .replace('{{CWD}}', context.cwd || process.cwd())
    .replace('{{SSH_CONNECTED}}', context.sshConnected ? 'Yes' : 'No')
    .replace('{{MCP_ENABLED}}', context.mcpEnabled ? 'Yes' : 'No')
    .replace('{{WEB_SEARCH_ENABLED}}', context.webSearchEnabled ? 'Yes' : 'No')
    .replace('{{BROWSER_SUPPORT}}', context.browserSupport ? 'Yes' : 'No')
  sections.push(sysInfo)
  sections.push('')

  // 8. Developer credit
  sections.push(DEVELOPER_CREDIT)

  return sections.join('\n')
}

/**
 * Build chat mode prompt
 */
export function buildChatPrompt(context: Omit<PromptContext, 'mode'>): string {
  return buildUnifiedPrompt({ ...context, mode: 'chat' })
}

/**
 * Build ReAct mode prompt for autonomous execution
 */
export function buildReActPrompt(
  taskDescription: string,
  terminalContext: string,
  historyContext: string,
  context?: Partial<PromptContext>
): string {
  return buildUnifiedPrompt({
    mode: 'react',
    taskDescription,
    terminalContext,
    historyContext,
    ...context
  })
}

/**
 * Build Cursor-style IDE prompt
 */
export function buildCursorPrompt(
  cursorMode: 'completion' | 'edit' | 'agent' | 'ask' | 'terminal' | 'debug' | 'quick_question',
  context?: Partial<PromptContext>
): string {
  return buildUnifiedPrompt({
    mode: 'cursor',
    cursorMode,
    ...context
  })
}

// ============================================================================
// SPECIALIZED PROMPTS (For specific scenarios)
// ============================================================================

/**
 * Long-running task prompt (for multi-day tasks)
 */
export const LONG_RUNNING_TASK_PROMPT = `## LONG-RUNNING TASK MODE

You are handling a task that may run for hours, days, or even months.

**Capabilities:**
- NO timeout constraints
- Monitor continuous output (top, htop, watch, tail -f)
- Track progress percentages
- Provide periodic status updates
- Detect errors immediately
- Create checkpoints for resumable tasks

**Task Types:**
1. Streaming (continuous): top, htop, watch, tail -f
2. Background (minutes-hours): npm install, docker build
3. Long-running (hours-days): database migrations, large compilations
4. Multi-day (days-months): MLPerf benchmarks, stress testing

**Communication:**
- Provide status every 5 minutes
- Extract and report progress percentages
- Alert on errors immediately
- Estimate completion time
- Save checkpoints frequently

**Example Status:**
\`\`\`
⏳ Task: Database Migration
📈 Progress: 342/1000 tables (34%)
⏱️ Elapsed: 2h 15m | Remaining: ~4h 30m
✅ No errors detected
\`\`\``

/**
 * System detection prompt
 */
export const SYSTEM_DETECTION_PROMPT = `## SYSTEM DETECTION

Analyze the terminal output and determine:

1. Operating System (Windows/Linux/macOS/Docker/K8s/Cloud)
2. Distribution (Ubuntu/RedHat/Debian/Alpine/Windows 10/11)
3. Environment (Local/AWS/Azure/GCP/Docker/Kubernetes)
4. Shell (PowerShell/CMD/Bash/Zsh/Sh)
5. User Permissions (root/admin/regular user)
6. Current Working Directory

**Detection Indicators:**
- Windows: "Microsoft Windows", "C:\\", PowerShell prompts
- Linux: "$" or "#" prompts, "/home/", "/usr/"
- Docker: "root@<short-id>"
- AWS: "ec2-user@", "ip-172-"
- macOS: "/Users/", "darwin"

Return JSON:
\`\`\`json
{
  "os": "windows|linux|macos|docker|unknown",
  "distribution": "ubuntu|windows_11|etc",
  "environment": "local|aws|docker|kubernetes|etc",
  "shell": "powershell|bash|zsh|etc",
  "user_permissions": "root|admin|user",
  "working_directory": "/path/or/C:\\path",
  "confidence": 0-100
}
\`\`\``

/**
 * Error recovery prompt
 */
export const ERROR_RECOVERY_PROMPT = `## ERROR RECOVERY

Analyze the failed command and provide a working alternative.

**Common Failure Patterns:**
- "not recognized" / "command not found" → Wrong OS, use OS-specific equivalent
- "permission denied" → Need sudo/admin privileges
- "no such file" → Path doesn't exist, check actual paths
- Timeout → Command too slow, try lighter alternative

**Response:**
1. Root cause analysis (why it failed)
2. Corrected command for detected OS
3. Alternative approaches if available`

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Main builder functions
  buildUnifiedPrompt,
  buildChatPrompt,
  buildReActPrompt,
  buildCursorPrompt,

  // Specialized prompts
  LONG_RUNNING_TASK_PROMPT,
  SYSTEM_DETECTION_PROMPT,
  ERROR_RECOVERY_PROMPT,

  // Components (for custom building)
  AGENT_IDENTITY,
  CAPABILITIES,
  RULES,
  OBJECTIVE,
  CHAT_MODE_INSTRUCTIONS,
  REACT_MODE_INSTRUCTIONS,
  CURSOR_MODE_INSTRUCTIONS,
  TOOLS_DOCUMENTATION,
  SYSTEM_INFO_TEMPLATE,
  DEVELOPER_CREDIT
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

// For existing code that uses old exports
export const LATENITE_AGENT_SYSTEM_PROMPT = AGENT_IDENTITY + '\n\n' + CAPABILITIES
export const CHAT_MODE_PROMPT = buildChatPrompt({})
export { buildReActPrompt as buildReActPromptLegacy }
