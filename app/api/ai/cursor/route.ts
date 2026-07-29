import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { buildCursorPrompt } from '../../../lib/prompts/unified-agent-prompt'

// Initialize AI clients
let openai: OpenAI | null = null
let anthropic: Anthropic | null = null

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

interface CursorRequest {
  type: 'completion' | 'edit' | 'agent' | 'ask' | 'terminal' | 'debug' | 'quick_question'
  mode?: 'agent' | 'ask' | 'edit'
  content: string
  context?: {
    terminalOutput?: string[]
    currentPath?: string
    sshHost?: string
    selectedCode?: string
    cursorPosition?: number
    recentCommands?: string[]
    projectFiles?: Array<{ name: string; content: string }>
    errorLogs?: string[]
  }
  references?: {
    files?: string[]
    web?: boolean
    docs?: string[]
  }
  model?: string
  provider?: 'openai' | 'anthropic'
}

// Cursor prompts now use unified system (see unified-agent-prompt.ts)

// Enhanced context building
function buildEnhancedContext(context?: CursorRequest['context'], references?: CursorRequest['references']): string {
  let contextStr = ''

  if (context?.sshHost) {
    contextStr += `**SSH Session**: Connected to ${context.sshHost}\n`
  }

  if (context?.currentPath) {
    contextStr += `**Current Path**: ${context.currentPath}\n`
  }

  if (context?.terminalOutput?.length) {
    contextStr += `**Recent Terminal Output**:\n${context.terminalOutput.slice(-5).join('\n')}\n\n`
  }

  if (context?.recentCommands?.length) {
    contextStr += `**Recent Commands**: ${context.recentCommands.join(', ')}\n\n`
  }

  if (context?.selectedCode) {
    contextStr += `**Selected Code/Text**:\n\`\`\`\n${context.selectedCode}\n\`\`\`\n\n`
  }

  if (context?.errorLogs?.length) {
    contextStr += `**Error Logs**:\n${context.errorLogs.join('\n')}\n\n`
  }

  if (context?.projectFiles?.length) {
    contextStr += `**Project Files**:\n${context.projectFiles.map(f => `${f.name}: ${f.content.slice(0, 200)}...`).join('\n')}\n\n`
  }

  if (references?.files?.length) {
    contextStr += `**Referenced Files**: ${references.files.join(', ')}\n`
  }

  if (references?.web) {
    contextStr += `**Web Search**: Enabled for up-to-date information\n`
  }

  if (references?.docs?.length) {
    contextStr += `**Documentation**: ${references.docs.join(', ')}\n`
  }

  return contextStr
}

// Intelligent code completion
async function generateCompletion(request: CursorRequest): Promise<string> {
  const context = buildEnhancedContext(request.context, request.references)
  const basePrompt = buildCursorPrompt('completion')
  const prompt = `${basePrompt}\n\n${context}\n\n**Complete this**: ${request.content}`

  return await callAI(prompt, request.provider || 'anthropic', request.model || 'claude-sonnet-4')
}

// Multi-line editing and smart rewrites
async function generateEdit(request: CursorRequest): Promise<string> {
  const context = buildEnhancedContext(request.context, request.references)
  const basePrompt = buildCursorPrompt('edit')
  const prompt = `${basePrompt}\n\n${context}\n\n**Edit Request**: ${request.content}\n\n**Original Code**: ${request.context?.selectedCode || ''}`

  return await callAI(prompt, request.provider || 'anthropic', request.model || 'claude-sonnet-4')
}

// Agent mode - autonomous task execution
async function generateAgentResponse(request: CursorRequest): Promise<string> {
  const context = buildEnhancedContext(request.context, request.references)
  const basePrompt = buildCursorPrompt('agent')
  const prompt = `${basePrompt}\n\n${context}\n\n**Task**: ${request.content}\n\nProvide a comprehensive solution with step-by-step implementation.`

  return await callAI(prompt, request.provider || 'anthropic', request.model || 'claude-sonnet-4')
}

// Ask mode - code Q&A
async function generateAskResponse(request: CursorRequest): Promise<string> {
  const context = buildEnhancedContext(request.context, request.references)
  const basePrompt = buildCursorPrompt('ask')
  const prompt = `${basePrompt}\n\n${context}\n\n**Question**: ${request.content}`

  return await callAI(prompt, request.provider || 'anthropic', request.model || 'claude-sonnet-4')
}

// Terminal command generation
async function generateTerminalCommand(request: CursorRequest): Promise<string> {
  const context = buildEnhancedContext(request.context, request.references)
  const basePrompt = buildCursorPrompt('terminal')
  const prompt = `${basePrompt}\n\n${context}\n\n**Natural Language Request**: ${request.content}\n\nGenerate the appropriate shell command(s).`

  return await callAI(prompt, request.provider || 'anthropic', request.model || 'claude-sonnet-4')
}

// Debugging and lint fixes
async function generateDebugResponse(request: CursorRequest): Promise<string> {
  const context = buildEnhancedContext(request.context, request.references)
  const basePrompt = buildCursorPrompt('debug')
  const prompt = `${basePrompt}\n\n${context}\n\n**Debug Request**: ${request.content}`

  return await callAI(prompt, request.provider || 'anthropic', request.model || 'claude-sonnet-4')
}

// Quick questions
async function generateQuickAnswer(request: CursorRequest): Promise<string> {
  const context = buildEnhancedContext(request.context, request.references)
  const basePrompt = buildCursorPrompt('quick_question')
  const prompt = `${basePrompt}\n\n${context}\n\n**Quick Question**: ${request.content}`

  return await callAI(prompt, request.provider || 'anthropic', request.model || 'claude-sonnet-4')
}

// AI calling function - supports both Anthropic and OpenAI
async function callAI(prompt: string, provider: 'anthropic' | 'openai', model: string): Promise<string> {
  try {
    if (provider === 'anthropic') {
      if (!anthropic) {
        throw new Error('Anthropic API key not configured')
      }

      const claudeModel = model.includes('4-5') ? 'claude-sonnet-4-5-20250929' : 'claude-sonnet-4-20250514'

      const completion = await anthropic.messages.create({
        model: claudeModel,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
      return completion.content[0]?.type === 'text' ? completion.content[0].text : 'No response generated'
    } else if (provider === 'openai') {
      if (!openai) {
        throw new Error('OpenAI API key not configured')
      }

      const openaiModel = model || 'gpt-4'

      const completion = await openai.chat.completions.create({
        model: openaiModel,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
      return completion.choices[0]?.message?.content || 'No response generated'
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }
  } catch (error) {
    throw new Error(`AI Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CursorRequest = await request.json()

    if (!body.type || !body.content) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: type and content'
      }, { status: 400 })
    }

    let response: string

    switch (body.type) {
      case 'completion':
        response = await generateCompletion(body)
        break
      case 'edit':
        response = await generateEdit(body)
        break
      case 'agent':
        response = await generateAgentResponse(body)
        break
      case 'ask':
        response = await generateAskResponse(body)
        break
      case 'terminal':
        response = await generateTerminalCommand(body)
        break
      case 'debug':
        response = await generateDebugResponse(body)
        break
      case 'quick_question':
        response = await generateQuickAnswer(body)
        break
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid request type'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      response,
      type: body.type,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cursor AI API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 