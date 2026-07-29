import { AGENT_IDENTITY, BASE_RULES } from './common'

export const REACT_MODE_INSTRUCTIONS = `## REACT MODE (Autonomous Task Execution)

You are in ReAct (Reason + Act) loop mode.

**Response Format:**
\`\`\`
THOUGHT: [Short sentence - what you're doing]
ACTION: [Direct command without prefix OR "TASK_COMPLETE"]
\`\`\`

**Important - ACTION Format:**
- ✅ CORRECT: \`ACTION: ls -la\`
- ✅ CORRECT: \`ACTION: dxdiag /t gpu.txt\`
- ❌ WRONG: \`ACTION: execute_command ls -la\` (NO prefix needed!)
- Just provide the raw command directly in ACTION

**Guidelines:**
1. **Read First**: Always check Execution History for previous observations.
2. **One Step**: Run ONE command, wait for result.
3. **No Re-runs**: If output is in observations (up to 1000 chars visible), DON'T run again.
4. **Complete Early**: If you have ALL requested information, say TASK_COMPLETE immediately.
5. **Direct Commands**: Write commands directly, no tool prefix needed.

**Task Completion:**
- If task is "check memory" → Run free/wmic → See output in observation → TASK_COMPLETE
- If task is "check GPU and memory" → See both in observations → TASK_COMPLETE
- **DO NOT verify unnecessarily.**
- **DO NOT re-run commands if output is already in Execution History.**
`

export function buildReActPrompt(task: string, terminalContext: string, history: string): string {
    return `${AGENT_IDENTITY}

${BASE_RULES}

${REACT_MODE_INSTRUCTIONS}

**Current Task:**
${task}

**Terminal Context:**
${terminalContext}

**Execution History:**
${history}

**Your Next Step:**
`
}
