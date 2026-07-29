import { NextRequest, NextResponse } from 'next/server'
import { LatenitePromptBuilder } from '../../lib/prompt-builder'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, task, terminal, history, iteration, ssh, mcp, messages } = body

    if (!mode || !['react', 'chat'].includes(mode)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid mode. Must be "react" or "chat"'
      }, { status: 400 })
    }

    const builder = new LatenitePromptBuilder()
    let prompt = ''

    if (mode === 'react') {
      if (!task) {
        return NextResponse.json({
          success: false,
          error: 'Task is required for react mode'
        }, { status: 400 })
      }

      prompt = builder.buildReactPrompt(
        task,
        terminal || '',
        history || [],
        iteration || 1
      )
    } else {
      prompt = builder.buildChatPrompt(
        messages || [],
        ssh || false,
        mcp || false
      )
    }

    // Calculate token stats (estimation)
    const originalEstimate = estimateOriginalTokens(body, mode)
    const optimizedTokens = Math.ceil(prompt.length / 4)
    const savings = ((originalEstimate - optimizedTokens) / originalEstimate * 100).toFixed(1)

    console.log(`💰 Prompt optimized (${mode}): ${originalEstimate} → ${optimizedTokens} tokens (${savings}% saved)`)

    return NextResponse.json({
      success: true,
      prompt: prompt,
      mode: mode,
      stats: {
        original_tokens: originalEstimate,
        optimized_tokens: optimizedTokens,
        tokens_saved: originalEstimate - optimizedTokens,
        savings_percent: parseFloat(savings),
        cost_saved: ((originalEstimate - optimizedTokens) * 0.000015).toFixed(6)
      }
    })

  } catch (error) {
    console.error('❌ Prompt builder error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function estimateOriginalTokens(body: any, mode: string): number {
  /**
   * Estimate tokens for original English prompts
   * React mode: ~2,800 tokens
   * Chat mode: ~1,500 tokens
   */
  if (mode === 'react') {
    // Original ReAct prompt is massive
    const basePrompt = 2800 // English prompt base
    const taskTokens = Math.ceil((body.task?.length || 0) / 4)
    const terminalTokens = Math.ceil((body.terminal?.length || 0) / 4)
    const historyTokens = Math.ceil(JSON.stringify(body.history || []).length / 4)

    return basePrompt + taskTokens + terminalTokens + historyTokens
  } else {
    // Chat mode base
    const basePrompt = 1500
    const messageTokens = Math.ceil(JSON.stringify(body.messages || []).length / 4)

    return basePrompt + messageTokens
  }
}

