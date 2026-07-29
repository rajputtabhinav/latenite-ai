/**
 * Type definitions for Prompt Builder API
 * Shared between client and server for type safety
 * 
 * @module types/prompt-builder
 */

export interface HistoryItem {
    thought: string
    action: string
    observation: string
}

export interface PromptBuilderRequest {
    mode: 'react' | 'chat'
    
    // React mode fields (for autonomous terminal tasks)
    task?: string
    terminal?: string
    history?: HistoryItem[]
    iteration?: number
    
    // Chat mode fields (for interactive chat)
    messages?: Array<{
        role: 'user' | 'assistant'
        content: string
    }>
    ssh?: boolean
    mcp?: boolean
}

export interface PromptBuilderStats {
    original_tokens: number
    optimized_tokens: number
    tokens_saved: number
    savings_percent: number
    cost_saved: string
}

export interface PromptBuilderResponse {
    success: boolean
    prompt?: string
    mode?: string
    stats?: PromptBuilderStats
    error?: string
}

// Type guard for successful response
export function isPromptBuilderSuccess(
    response: PromptBuilderResponse
): response is Required<Pick<PromptBuilderResponse, 'success' | 'prompt'>> {
    return response.success === true && typeof response.prompt === 'string'
}

// Type guard for error response
export function isPromptBuilderError(
    response: PromptBuilderResponse
): response is Required<Pick<PromptBuilderResponse, 'success' | 'error'>> {
    return response.success === false && typeof response.error === 'string'
}
