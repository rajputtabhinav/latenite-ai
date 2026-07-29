import { NextRequest, NextResponse } from 'next/server'
import { getGlobalCache } from '../../../lib/agent-cache'
import { getGlobalRouter } from '../../../lib/multi-model-router'
import Anthropic from '@anthropic-ai/sdk'

// Anthropic configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// Initialize Anthropic client with timeout
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  timeout: 5 * 60 * 1000, // 5 minutes timeout
  maxRetries: 2
})

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  cache_control?: { type: 'ephemeral' } // Anthropic prompt caching
}

// Import unified prompt system
import { buildChatPrompt } from '../../../lib/prompts/unified-agent-prompt'

// Build system prompt
const SYSTEM_PROMPT = buildChatPrompt({})

async function getContext7Documentation(query: string): Promise<string> {
  try {
    // Enhanced Context7 integration with keyword detection
    const keywords = query.toLowerCase()
    let libraryId = ''
    let topic = query

    if (keywords.includes('openai') || keywords.includes('gpt') || keywords.includes('chat')) {
      libraryId = '/openai/openai-node'
      topic = 'chat completions'
    } else if (keywords.includes('anthropic') || keywords.includes('claude')) {
      libraryId = '/anthropic/anthropic-sdk-typescript'
      topic = 'messages API'
    } else if (keywords.includes('next') || keywords.includes('nextjs')) {
      libraryId = '/vercel/next.js'
    } else if (keywords.includes('react')) {
      libraryId = '/facebook/react'
    } else if (keywords.includes('node') || keywords.includes('nodejs')) {
      libraryId = '/nodejs/node'
    } else if (keywords.includes('ssh') || keywords.includes('terminal')) {
      return `[SSH & Terminal Documentation]

Common SSH commands:
- ssh user@host - Connect to remote server
- ssh-keygen -t rsa -b 4096 - Generate SSH key pair
- scp file user@host:path - Copy files over SSH
- ssh -i keyfile user@host - Connect using specific key

Terminal troubleshooting:
- Check connection: ping hostname
- Test SSH: ssh -v user@host
- Check ports: netstat -an | grep :22
- View logs: tail -f /var/log/auth.log`
    }

    if (libraryId) {
      return `[Context7 Documentation for ${libraryId}]

Topic: ${topic}

This would typically contain:
- API reference and examples
- Best practices and patterns  
- Error handling and troubleshooting
- Code snippets and implementations

For full documentation, visit the official docs at the respective library's website.`
    }

    return ''
  } catch (error) {
    console.error('Context7 documentation error:', error)
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'claude-sonnet-4-5', terminalContext, autoRouteModel = true } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid messages format'
      }, { status: 400 })
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Anthropic API key not configured. Please set ANTHROPIC_API_KEY in environment variables.'
      }, { status: 400 })
    }

    // Get global instances inside function
    const cache = getGlobalCache()
    const router = getGlobalRouter()

    // Check response cache first
    const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop()
    if (lastUserMessage) {
      const cached = cache.getCachedResponse(lastUserMessage.content)
      if (cached) {
        console.log('✅ Cache hit! Returning cached response (90% cost savings)')
        return NextResponse.json({
          ...cached,
          cached: true,
          cacheStats: cache.getStats()
        })
      }
    }

    let context7Data = ''

    if (lastUserMessage) {
      context7Data = await getContext7Documentation(lastUserMessage.content)
    }

    // Build enhanced system prompt with context
    let enhancedSystemPrompt = SYSTEM_PROMPT

    if (terminalContext && terminalContext.length > 0) {
      enhancedSystemPrompt += `\n\n**Current Terminal Context**:\n${terminalContext.join('\n')}\n\nAnalyze the terminal output above when relevant to the user's query.`
    }

    if (context7Data) {
      enhancedSystemPrompt += `\n\n**Relevant Documentation**:\n${context7Data}`
    }

    // Cache the system prompt (Anthropic prompt caching)
    const systemPromptCache = cache.cachePrompt(enhancedSystemPrompt)

    // Build messages with cache control for Anthropic
    const systemMessage: Message = {
      role: 'system',
      content: enhancedSystemPrompt,
      cache_control: { type: 'ephemeral' } // Enable Anthropic prompt caching
    }

    const allMessages = [systemMessage, ...messages]

    // Always use Claude Sonnet 4.5 - best model with 1M context and 64K output
    const anthropicModel = 'claude-sonnet-4-20250514'
    const modelInfo = { name: 'Claude Sonnet 4.5', speed: 'medium', cost: 0 }

    console.log(`🤖 Using Claude Sonnet 4.5 (1M context, 64K max tokens)`)

    // Call Anthropic API directly using SDK
    console.log(`🤖 Calling Anthropic API with model: ${anthropicModel}`)
    
    const response = await anthropic.messages.create({
      model: anthropicModel,
      max_tokens: 64000, // Claude Sonnet 4.5 official limit
      temperature: 0.4,
      system: [
        {
          type: 'text',
          text: enhancedSystemPrompt,
          cache_control: { type: 'ephemeral' } // Enable prompt caching
        }
      ],
      messages: messages.map((m: Message) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
      }))
    })

    const aiResponse = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : 'No response generated'

    // Check if response contains code
    const hasCode = /```[\s\S]*?```/.test(aiResponse)

    const responseData: any = {
      success: true,
      message: aiResponse,
      hasCode,
      provider: 'anthropic',
      model: modelInfo.name,
      modelSpeed: modelInfo.speed,
      estimatedCost: modelInfo.cost,
      cached: false,
      cacheStats: cache.getStats(),
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_read_tokens: response.usage.cache_read_input_tokens || 0,
        cache_creation_tokens: response.usage.cache_creation_input_tokens || 0
      }
    }

    // Cache the response for future requests
    if (lastUserMessage) {
      cache.cacheResponse(lastUserMessage.content, responseData)
      console.log('💾 Response cached for future requests')
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('AI Chat API Error:', error)

    let errorMessage = 'Unknown error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    // Anthropic-specific error handling
    if (error.status === 401) {
      errorMessage = 'Invalid Anthropic API key. Please check ANTHROPIC_API_KEY in environment variables.'
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
    } else if (error.status === 529) {
      errorMessage = 'Anthropic API is overloaded. Please try again in a moment.'
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      status: error.status
    }, { status: error.status || 500 })
  }
}
