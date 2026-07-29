/**
 * ⚠️ SERVER-SIDE ONLY ⚠️
 * 
 * This file uses Node.js file system APIs (fs, path, process)
 * DO NOT import this in client-side components or React hooks
 * 
 * For client-side usage, call the API endpoint instead:
 * POST /api/prompt-builder
 * 
 * This file is only used in:
 * - app/api/prompt-builder/route.ts (API route - server-side ✓)
 */

import fs from 'fs'
import path from 'path'

// Types matching the JSON schemas
interface SystemSchema {
    agent: {
        name: string
        role: string
    }
}

interface ReactSchema {
    rules: {
        core: string[]
    }
    special_actions: Record<string, any>
    examples: Record<string, Example>
}

interface ChatSchema {
    agent_name: string
    capabilities_summary: string
    response_guidelines: {
        format: string
    }
}

interface Example {
    t: string
    a: string
    o?: string
}

interface HistoryItem {
    thought: string
    action: string
    observation: string
}

export class LatenitePromptBuilder {
    private basePath: string
    private systemSchema: SystemSchema | null = null
    private reactSchema: ReactSchema | null = null
    private chatSchema: ChatSchema | null = null

    constructor() {
        this.basePath = path.join(process.cwd(), 'app', 'prompts')
        this.loadSchemas()
    }

    private loadSchemas() {
        try {
            this.systemSchema = this.loadSchema<SystemSchema>('system-prompt.json')
            this.reactSchema = this.loadSchema<ReactSchema>('react-agent.json')
            this.chatSchema = this.loadSchema<ChatSchema>('chat-agent.json')
        } catch (error) {
            console.error('Error loading schemas:', error)
        }
    }

    private loadSchema<T>(filename: string): T | null {
        try {
            const filepath = path.join(this.basePath, filename)
            if (fs.existsSync(filepath)) {
                const content = fs.readFileSync(filepath, 'utf-8')
                return JSON.parse(content) as T
            }
            return null
        } catch (error) {
            console.error(`Error loading ${filename}:`, error)
            return null
        }
    }

    public buildReactPrompt(
        task: string,
        terminal: string,
        history: HistoryItem[],
        iteration: number
    ): string {
        if (!this.systemSchema || !this.reactSchema) {
            return 'Error: Schemas not loaded'
        }

        // Detect OS
        const osType = this.detectOS(terminal)

        // Compress context
        const compressedTerminal = this.compressTerminal(terminal)
        const compressedHistory = this.compressHistory(history)

        // Get relevant example
        const example = this.selectExample(task, osType)

        // Build compact prompt structure
        const promptData = {
            agent: this.systemSchema.agent.name,
            role: this.systemSchema.agent.role,
            task: task,
            terminal: compressedTerminal,
            iter: iteration,
            hist: compressedHistory,
            os: osType,
            rules: this.reactSchema.rules.core,
            actions: Object.keys(this.reactSchema.special_actions),
            format: "THOUGHT|ACTION",
            ex: example
        }

        // Create minimal instruction
        const jsonCompact = JSON.stringify(promptData)

        const instruction = `You are ${this.systemSchema.agent.name}. Analyze and respond in THOUGHT|ACTION format.

Context: ${jsonCompact}

Rules: ${this.reactSchema.rules.core.slice(0, 5).join(', ')}

Respond with:
THOUGHT: <what you're doing - max 80 chars>
ACTION: <single command or TASK_COMPLETE>`

        return instruction
    }

    public buildChatPrompt(
        messages: any[],
        sshConnected: boolean,
        mcpEnabled: boolean
    ): string {
        if (!this.chatSchema) {
            return 'Error: Chat schema not loaded'
        }

        const chat = this.chatSchema

        const promptData = {
            agent: chat.agent_name,
            mode: "chat",
            caps: chat.capabilities_summary,
            ssh: sshConnected,
            mcp: mcpEnabled,
            format: chat.response_guidelines.format
        }

        const jsonCompact = JSON.stringify(promptData)

        const instruction = `You are ${chat.agent_name}, an expert full-stack developer and system administrator.

Config: ${jsonCompact}

Respond with bullet points, provide executable commands when appropriate.`

        return instruction
    }

    private detectOS(terminal: string): string {
        const tLower = terminal.toLowerCase()

        // Windows detection
        if (['c:\\', 'microsoft windows', 'ps c:\\'].some(indicator => tLower.includes(indicator))) {
            return 'windows'
        }

        // Linux detection
        if ((terminal.includes('$') || terminal.includes('#')) &&
            ['/home/', '/usr/', '/root/'].some(path => tLower.includes(path))) {
            return 'linux'
        }

        // Docker detection
        if (terminal.includes('root@') && terminal.split('root@')[1]?.split(':')[0]?.length === 12) {
            return 'docker'
        }

        // AWS detection
        if (tLower.includes('ip-172') || tLower.includes('ec2-user')) {
            return 'aws'
        }

        // macOS detection
        if (tLower.includes('/users/') || tLower.includes('darwin')) {
            return 'macos'
        }

        return 'unknown'
    }

    private compressTerminal(terminal: string): string {
        // Keep last 500 chars
        if (terminal.length > 500) {
            return '...' + terminal.slice(-500)
        }
        return terminal
    }

    private compressHistory(history: HistoryItem[]): any[] {
        // Keep last 4 iterations (increased from 2) - more context for task completion
        const recent = history.length > 4 ? history.slice(-4) : history

        return recent.map(h => ({
            t: h.thought.slice(0, 120),      // Increased from 50 to 120 chars
            a: h.action,                      // Keep full action
            o: h.observation.slice(0, 1000)   // Increased from 100 to 1000 chars - see complete outputs
        }))
    }

    private selectExample(task: string, os: string): Example {
        if (!this.reactSchema) return { t: "Starting task...", a: "" }

        const taskLower = task.toLowerCase()
        const examples = this.reactSchema.examples

        // Memory check
        if (taskLower.includes("memory") || taskLower.includes("ram")) {
            return os === "windows" ? examples["check_memory_windows"] : examples["check_memory_linux"]
        }

        // Disk check
        if (taskLower.includes("disk") || taskLower.includes("space")) {
            return os === "windows" ? examples["check_disk_windows"] : examples["check_disk_linux"]
        }

        // Cleanup
        if (taskLower.includes("concat") || taskLower.includes("mess")) {
            return examples["cleanup_concat"]
        }

        // Default
        return { t: "Starting task...", a: "" }
    }
}
