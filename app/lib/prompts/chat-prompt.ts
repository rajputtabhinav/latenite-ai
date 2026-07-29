import { AGENT_IDENTITY, BASE_RULES } from './common'

export const CHAT_MODE_INSTRUCTIONS = `## CHAT MODE

You are in interactive chat mode.

**Guidelines:**
1. **Be Helpful**: Answer questions clearly.
2. **Use Tools**: If you need to check something, suggest a command or use a tool.
3. **Concise**: Keep answers brief unless asked for detail.
`

export function buildChatPrompt(context: {
    systemInfo?: string
    terminalContext?: string
    relevantFiles?: string[]
    projectAnalysis?: any
}): string {
    const { systemInfo, terminalContext, relevantFiles, projectAnalysis } = context

    let prompt = `${AGENT_IDENTITY}

${BASE_RULES}

${CHAT_MODE_INSTRUCTIONS}
`

    if (systemInfo) {
        prompt += `\n**System Info:**\n${systemInfo}\n`
    }

    if (terminalContext) {
        prompt += `\n**Terminal Context:**\n${terminalContext}\n`
    }

    if (relevantFiles && relevantFiles.length > 0) {
        prompt += `\n**Relevant Files:**\n${relevantFiles.join('\n')}\n`
    }

    if (projectAnalysis) {
        prompt += `\n**Project Analysis:**\n${JSON.stringify(projectAnalysis, null, 2)}\n`
    }

    return prompt
}
