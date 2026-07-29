import { useCallback, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import type { AIMessage } from '../../../types'
import type { PromptBuilderRequest, PromptBuilderResponse } from '../../../types/prompt-builder'
import { TerminalAgentController } from '../../../lib/terminal-agent-integration'
import { ParallelExecutor } from '../../../lib/parallel-executor'
import { AutonomousErrorRecovery } from '../../../lib/autonomous-error-recovery'

// Unique ID generator to prevent duplicate keys
let messageIdCounter = 0
const generateUniqueMessageId = () => {
  messageIdCounter++
  return `${Date.now()}_${messageIdCounter}_${Math.random().toString(36).substring(2, 9)}`
}

interface UseAgentExecutionProps {
    sshSocket: Socket | null
    setMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>
    setIsLoading: (loading: boolean) => void
    setStreamingMessageId: (id: string | null) => void
    setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void
    selectedModel: string
    terminalHistory: string[]
    addAutoPilotMessage: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void
    terminalAgent: TerminalAgentController
    onCommandExecuted?: (count: number) => void
}

interface ReActStep {
    thought: string
    action: string
    observation: string
}

export function useAgentExecution({
    sshSocket,
    setMessages,
    setIsLoading,
    setStreamingMessageId,
    setConnectionStatus,
    selectedModel,
    terminalHistory,
    addAutoPilotMessage,
    terminalAgent,
    onCommandExecuted
}: UseAgentExecutionProps) {

    const abortControllerRef = useRef<AbortController | null>(null)
    
    // Add ref for stable access to terminal history
    const terminalHistoryRef = useRef(terminalHistory)
    terminalHistoryRef.current = terminalHistory

    const handleAutonomousTerminalTask = useCallback(async (input: string) => {
        if (!sshSocket) {
            addAutoPilotMessage('SSH connection required for autonomous tasks.', 'error')
            return
        }

        setIsLoading(true)
        abortControllerRef.current = new AbortController()

        // Add user message
        const userMsg: AIMessage = {
            id: generateUniqueMessageId(),
            role: 'user',
            content: input,
            timestamp: new Date(),
            type: 'text'
        }
        setMessages(prev => [...prev, userMsg])

        // FIX: Enable autopilot mode for fully autonomous execution
        terminalAgent.setAutoPilotMode(true)
        console.log('[Agent] Autopilot mode enabled - commands will execute automatically without approval')

        try {
            const history: ReActStep[] = []
            let isComplete = false
            let iterations = 0
            const MAX_ITERATIONS = 50 // Safety limit to prevent infinite loops

            // Create single working message that will be updated throughout execution
            const workingMsgId = generateUniqueMessageId()
            const workingMsg: AIMessage = {
                id: workingMsgId,
                role: 'assistant',
                content: '🤖 Working on your task...',
                timestamp: new Date(),
                type: 'text',
                isStreaming: true
            }
            setMessages(prev => [...prev, workingMsg])

            // Helper function to update progress message
            const updateProgress = (content: string) => {
                setMessages(prev => prev.map(msg => 
                    msg.id === workingMsgId 
                        ? { ...msg, content, timestamp: new Date() }
                        : msg
                ))
            }

            // Build full context via API (server-side) - SILENTLY
            let fullContextString = ''
            let conversationContext = ''
            
            try {
                // Build context and query memory in parallel (no UI messages)
                const [contextResponse, memoryResponse] = await Promise.all([
                    fetch('/api/context/build', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            task: input,
                            terminalHistory: terminalHistoryRef.current
                        })
                    }),
                    fetch('/api/memory/query', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: input
                        })
                    })
                ])

                if (contextResponse.ok) {
                    const contextData = await contextResponse.json()
                    fullContextString = contextData.formatted || ''
                }
                
                if (memoryResponse.ok) {
                    const memoryData = await memoryResponse.json()
                    conversationContext = memoryData.context || ''
                }
            } catch (contextError) {
                console.warn('Failed to build full context:', contextError)
                // Continue with basic context
            }

            while (!isComplete && iterations < MAX_ITERATIONS) {
                if (abortControllerRef.current?.signal.aborted) {
                    addAutoPilotMessage('Task cancelled by user.', 'warning')
                    break
                }

                iterations++

                // Build prompt with FULL context
                const fullTerminal = terminalHistoryRef.current.join('\n')
                
                // Build prompt via API (server-side) to avoid Node.js dependencies (fs, path, process)
                let basePrompt = ''
                try {
                    const promptResponse = await fetch('/api/prompt-builder', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            mode: 'react',
                            task: input,
                            terminal: fullTerminal,
                            history: history,
                            iteration: iterations
                        } satisfies PromptBuilderRequest)
                    })
                    
                    if (promptResponse.ok) {
                        const promptData = await promptResponse.json() as PromptBuilderResponse
                        basePrompt = promptData.prompt || ''
                        
                        // Log token savings stats
                        if (promptData.stats) {
                            console.log(
                                `💰 Prompt optimized: ${promptData.stats.tokens_saved} tokens saved ` +
                                `(${promptData.stats.savings_percent}% reduction)`
                            )
                        }
                    } else {
                        const errorText = await promptResponse.text()
                        console.error('Failed to build prompt via API:', errorText)
                        
                        // Fallback: Use simple prompt format
                        basePrompt = `Task: ${input}\n\nTerminal Context:\n${fullTerminal.slice(-500)}\n\nIteration: ${iterations}`
                    }
                } catch (promptError) {
                    console.warn('Prompt builder API call failed:', promptError)
                    
                    // Fallback: Use simple prompt format
                    basePrompt = `Task: ${input}\n\nTerminal Context:\n${fullTerminal.slice(-500)}\n\nIteration: ${iterations}`
                }
                
                // Add full context if available
                let prompt = basePrompt
                if (fullContextString) {
                    prompt += '\n\n' + fullContextString
                }
                if (conversationContext) {
                    prompt += '\n\n' + conversationContext
                }

                // 2. Call LLM with full context and MCP enabled
                const response = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'user', content: prompt }
                        ],
                        model: selectedModel,
                        terminalContext: terminalHistoryRef.current, // Full terminal history
                        mcpEnabled: true,                 // Enable MCP tools
                        hasLiveAccess: true,              // Enable live tool access
                        enabledServers: [                 // All MCP servers
                            'context7',
                            'web-search',
                            'playwright',
                            'filesystem',
                            'terminal'
                        ]
                    }),
                    signal: abortControllerRef.current.signal
                })

                if (!response.ok) throw new Error('AI API request failed')

                const data = await response.json()
                const aiContent = data.message || ''

                // 3. Parse Response - ENHANCED COMMAND EXTRACTION
                const thoughtMatch = aiContent.match(/THOUGHT:\s*(.+?)(?=\n|ACTION:|$)/s)
                const actionMatch = aiContent.match(/ACTION:\s*(.+?)(?=\n|$)/s)

                const thought = thoughtMatch ? thoughtMatch[1].trim() : 'Processing...'
                let action = actionMatch ? actionMatch[1].trim() : ''
                
                // ENHANCED FIX: Better command extraction
                // Remove common action placeholders that aren't real commands
                const actionPlaceholders = ['execute_command', 'run_command', 'send_command', 'execute', 'run']
                
                for (const placeholder of actionPlaceholders) {
                    if (action === placeholder) {
                        // Action is ONLY the placeholder - invalid, need to extract real command
                        console.warn(`[Agent] Invalid action detected: "${action}" - extracting from full response`)
                        
                        // Try to find actual command in response body
                        // Pattern 1: Look for commands in code blocks
                        const codeBlockMatch = aiContent.match(/```(?:bash|sh|shell|powershell|cmd)?\s*\n(.+?)\n```/s)
                        if (codeBlockMatch) {
                            action = codeBlockMatch[1].trim()
                            console.log(`[Agent] Extracted command from code block: ${action}`)
                            break
                        }
                        
                        // Pattern 2: Look for "Command: xxx" format
                        const commandMatch = aiContent.match(/(?:command|cmd):\s*`?(.+?)`?(?:\n|$)/i)
                        if (commandMatch) {
                            action = commandMatch[1].trim()
                            console.log(`[Agent] Extracted command from label: ${action}`)
                            break
                        }
                        
                        // Pattern 3: If still invalid, reject this iteration
                        console.error(`[Agent] Could not extract valid command from AI response`)
                        action = '' // Clear invalid action
                        break
                    } else if (action.startsWith(placeholder + ' ')) {
                        // Action has placeholder prefix with command after - extract it
                        action = action.replace(new RegExp(`^${placeholder}\\s+`), '').trim()
                        console.log(`[Agent] Extracted command from prefix: ${action}`)
                        break
                    }
                }
                
                // Validate action is not empty and not a placeholder
                if (!action || actionPlaceholders.includes(action.toLowerCase())) {
                    observation = 'Could not extract valid command from AI response. Please try again.'
                    updateProgress(
                        `🤖 **Working on your task...**\n\n` +
                        `**Progress:** Iteration ${iterations}/${MAX_ITERATIONS}\n\n` +
                        `💭 **Thinking:** ${thought}\n\n` +
                        `⚠️ **Issue:** No valid command extracted - retrying...`
                    )
                    continue // Skip to next iteration
                }

                // Update progress message (not create new)
                updateProgress(
                    `🤖 **Working on your task...**\n\n` +
                    `**Progress:** Iteration ${iterations}/${MAX_ITERATIONS}\n\n` +
                    `💭 **Thinking:** ${thought}\n\n` +
                    `${action !== 'TASK_COMPLETE' ? `🔧 **Action:** \`${action}\`` : '⏳ **Status:** Finalizing...'}`
                )

                // 4. Execute Action(s) - PARALLEL EXECUTION ENABLED
                let observation = ''

                if (action) {
                    if (action === 'TASK_COMPLETE') {
                        isComplete = true
                        break
                    }

                    // Create parallel executor
                    const parallelExecutor = new ParallelExecutor(terminalAgent)
                    
                    // Parse multiple commands from AI response
                    const commands = parallelExecutor.parseMultipleCommands(aiContent)
                    
                    if (commands.length === 0) {
                        // Fallback to single action
                        commands.push(action)
                    }
                    
                    // Notify parent about commands executed
                    if (onCommandExecuted && commands.length > 0) {
                        onCommandExecuted(commands.length)
                    }

                    try {
                        // Initialize error recovery system
                        const errorRecovery = new AutonomousErrorRecovery()

                        if (commands.length === 1) {
                            // Single command execution with auto-recovery (silent)
                            console.log(`[Agent] Queueing command: ${commands[0]}`)
                            
                            // CRITICAL: First queue/send the command
                            await terminalAgent.queueCommand(
                                commands[0], 
                                `Iteration ${iterations}: ${thought}`,
                                false  // No user approval needed for autonomous tasks
                            )
                            
                            console.log(`[Agent] Waiting for completion: ${commands[0]}`)
                            
                            // Then wait for it to complete
                            const cmdResult = await terminalAgent.waitForCommandCompletion(commands[0])
                            
                            console.log(`[Agent] Command completed - exitCode: ${cmdResult?.exitCode}, hasOutput: ${!!cmdResult?.stdout}`)
                            
                            // Check if command failed
                            if (cmdResult?.exitCode !== 0 && cmdResult?.stderr) {
                                // Attempt automatic recovery (silent)
                                const recoveryResult = await errorRecovery.recover(
                                    {
                                        command: commands[0],
                                        error: cmdResult.stderr,
                                        stderr: cmdResult.stderr,
                                        stdout: cmdResult.stdout || '',
                                        exitCode: cmdResult.exitCode,
                                        attemptNumber: 1
                                    },
                                    async (fixCmd: string) => {
                                        await terminalAgent.queueCommand(fixCmd, 'Auto-recovery')
                                        const result = await terminalAgent.waitForCommandCompletion(fixCmd)
                                        return result?.stdout || result?.stderr || ''
                                    }
                                )

                                if (recoveryResult.success) {
                                    observation = `Original command failed, but recovered automatically.\n\n` +
                                                `Recovery strategy: ${recoveryResult.strategy?.description}\n` +
                                                `Fix command: ${recoveryResult.fixCommand}\n\n` +
                                                `Output:\n${recoveryResult.output}`
                                } else {
                                    observation = cmdResult?.stdout || cmdResult?.stderr || 'Command failed.'
                                    // Only show error in progress message
                                    updateProgress(
                                        `🤖 **Working on your task...**\n\n` +
                                        `**Progress:** Iteration ${iterations}/${MAX_ITERATIONS}\n\n` +
                                        `💭 **Thinking:** ${thought}\n\n` +
                                        `🔧 **Action:** \`${action}\`\n\n` +
                                        `❌ **Error:** Command failed after ${recoveryResult.attempts} recovery attempts`
                                    )
                                }
                            } else {
                                observation = cmdResult?.stdout || cmdResult?.stderr || 'Command executed.'
                            }
                        } else {
                            // PARALLEL execution for multiple commands (silent)
                            console.log(`[Agent] Executing ${commands.length} commands in parallel`)
                            const executions = await parallelExecutor.executeBatch(commands)
                            console.log(`[Agent] Parallel execution completed`)
                            const stats = parallelExecutor.getStats(executions)
                            
                            observation = parallelExecutor.aggregateResults(executions)
                            
                            // Update progress with parallel execution results
                            updateProgress(
                                `🤖 **Working on your task...**\n\n` +
                                `**Progress:** Iteration ${iterations}/${MAX_ITERATIONS}\n\n` +
                                `💭 **Thinking:** ${thought}\n\n` +
                                `🔧 **Action:** Executed ${commands.length} commands in parallel\n\n` +
                                `📊 **Result:** ${stats.successful}/${stats.total} commands completed` +
                                (stats.parallelizationGain > 1 ? ` (${stats.parallelizationGain.toFixed(1)}x speedup)` : '')
                            )
                        }

                    } catch (execError: any) {
                        observation = `Error executing command: ${execError.message}`
                        // Show error in progress message
                        updateProgress(
                            `🤖 **Working on your task...**\n\n` +
                            `**Progress:** Iteration ${iterations}/${MAX_ITERATIONS}\n\n` +
                            `💭 **Thinking:** ${thought}\n\n` +
                            `🔧 **Action:** \`${action}\`\n\n` +
                            `❌ **Error:** ${execError.message}`
                        )
                    }
                } else {
                    observation = 'No action specified. Please provide an ACTION.'
                }

                // 5. Update History
                history.push({
                    thought,
                    action,
                    observation
                })
            }

            // Check if iteration limit was reached
            if (iterations >= MAX_ITERATIONS && !isComplete) {
                updateProgress(
                    `⚠️ **Task execution stopped**\n\n` +
                    `Reached maximum iteration limit (${MAX_ITERATIONS}).\n\n` +
                    `Please simplify your request or break it into smaller tasks.`
                )
            } else {
                // Task completed successfully - Format history into completion message with actual results
                const totalSteps = history.length
                const finalStep = history[totalSteps - 1]
                const finalThought = finalStep?.thought || 'Task completed'
                const finalObservation = finalStep?.observation || ''
                
                let completionMessage = `✅ **Task Completed Successfully!**\n\n`
                
                // Show what was accomplished
                completionMessage += `**Summary:** ${finalThought}\n\n`
                
                // Show the actual result/output from last command
                if (finalObservation && finalObservation.trim().length > 0) {
                    const resultText = finalObservation.length > 2000 
                        ? finalObservation.substring(0, 2000) + '\n\n... (output truncated, see terminal for full output)'
                        : finalObservation
                    
                    completionMessage += `**Result:**\n\`\`\`\n${resultText}\n\`\`\`\n\n`
                }
                
                // Show execution stats
                completionMessage += `**Execution Details:**\n`
                completionMessage += `- Steps completed: ${totalSteps}\n`
                completionMessage += `- Commands executed: ${history.filter(h => h.action && h.action !== 'TASK_COMPLETE').length}\n`
                
                // Show all steps if multiple
                if (totalSteps > 1) {
                    completionMessage += `\n**All Steps:**\n`
                    history.slice(0, -1).forEach((step, i) => {
                        completionMessage += `${i + 1}. ${step.action}\n`
                    })
                }
                
                updateProgress(completionMessage)
            }

            // Mark working message as complete
            setMessages(prev => prev.map(msg => 
                msg.id === workingMsgId 
                    ? { ...msg, isStreaming: false }
                    : msg
            ))

        } catch (error: any) {
            if (error.name === 'AbortError') {
                // Update progress message for cancellation
                setMessages(prev => prev.map(msg => 
                    msg.id === workingMsgId 
                        ? { ...msg, content: '⚠️ **Task cancelled by user**', isStreaming: false }
                        : msg
                ))
                setIsLoading(false)
                abortControllerRef.current = null
                return
            }
            console.error('Agent execution error:', error)
            // Update progress message with error
            setMessages(prev => prev.map(msg => 
                msg.id === workingMsgId 
                    ? { ...msg, content: `❌ **Agent error:** ${error.message}`, isStreaming: false }
                    : msg
            ))
        } finally {
            // FIX: Disable autopilot mode when task ends
            terminalAgent.setAutoPilotMode(false)
            console.log('[Agent] Autopilot mode disabled - returning to manual approval mode')
            setIsLoading(false)
            abortControllerRef.current = null
        }
    }, [sshSocket, setMessages, setIsLoading, selectedModel, addAutoPilotMessage]) // Removed terminalAgent (stable) and terminalHistory (using ref)

    return {
        handleAutonomousTerminalTask
    }
}
