import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { rateLimiter, RATE_LIMITS, getClientIdentifier } from '../../../lib/utils/rate-limiter'

// Import or create shared MCP manager
interface MCPServerStatus {
  running: boolean
  status: string
  config: {
    name: string
    category: string
    tools: string[]
  }
}

// **ANTHROPIC CONFIGURATION**
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// Initialize Anthropic client
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
}) : null

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Import unified prompt system
import { buildChatPrompt } from '../../../lib/prompts/unified-agent-prompt'

// Build prompt dynamically based on context
const buildSystemPrompt = (context: {
  sshConnected?: boolean
  mcpEnabled?: boolean
  webSearchEnabled?: boolean
}) => {
  return buildChatPrompt({
    sshConnected: context.sshConnected,
    mcpEnabled: context.mcpEnabled,
    webSearchEnabled: context.webSearchEnabled
  })
}

export async function POST(request: NextRequest) {
  // Rate limiting - prevent AI API abuse
  const clientId = getClientIdentifier(request)
  const rateLimit = rateLimiter.check(clientId, RATE_LIMITS.AI_STREAM)
  
  if (rateLimit.limited) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    return new Response(JSON.stringify({
      error: rateLimit.error,
      retryAfter
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': RATE_LIMITS.AI_STREAM.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
      }
    })
  }

  try {
    const {
      messages,
      model = 'claude-sonnet-4-5',
      terminalContext,
      mcpEnabled = false,
      mcpContext = null,
      hasLiveAccess = false,
      conversationSessionId = null  // NEW: Session management
    } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 })
    }

    // NEW: Get conversation context from session if provided
    let sessionSummary = null
    let effectiveMessages = messages
    let sessionStats = null

    if (conversationSessionId && typeof conversationSessionId === 'string') {
      // Get session context from backend (via global function)
      const sessionContext = (global as any).getConversationContext?.(conversationSessionId)

      if (sessionContext) {
        sessionSummary = sessionContext.summary
        sessionStats = sessionContext.stats

        // Use only recent messages from session (last 10)
        const recentSessionMessages = sessionContext.messages.slice(-10)

        console.log(`📊 Session ${conversationSessionId}: ${sessionStats.total} total, ${sessionStats.recent} recent, ${sessionStats.summarized} summarized, ${sessionStats.tokensSaved} tokens saved`)

        // Construct messages with summary if available
        if (sessionSummary) {
          // Add summary as context to first user message
          effectiveMessages = [
            ...recentSessionMessages,
            ...messages
          ]
        } else {
          effectiveMessages = [...recentSessionMessages, ...messages]
        }
      }
    }

    // **ENHANCED MCP INTEGRATION**: Build comprehensive system prompt with live capabilities
    let enhancedSystemPrompt = buildSystemPrompt({
      sshConnected: !!terminalContext,
      mcpEnabled: mcpEnabled || hasLiveAccess,
      webSearchEnabled: true
    })

    // NEW: Add session summary if available
    if (sessionSummary) {
      enhancedSystemPrompt += `\n\n**📚 CONVERSATION CONTEXT**: You have access to a summary of the earlier conversation. Use this context when relevant:\n\n${sessionSummary}`
    }

    if (hasLiveAccess || mcpEnabled) {
      if (mcpContext && mcpContext !== 'No MCP servers could handle the request') {
        enhancedSystemPrompt += `\n\n**🌐 LIVE ACCESS CAPABILITIES** (Real, Working Tools):
You have access to these ACTUAL working tools that provide real-time data:
• **Context7 Documentation** - Fetch the LATEST documentation for 30+ libraries/frameworks
• **Web Search & Scraping** - Search the web and scrape websites for CURRENT information  
• **Advanced Web Automation** - Use Puppeteer for complex scraping and browser automation
• **File System Operations** - Read files, list directories, and search files
• **Terminal Commands** - Execute basic terminal/shell commands for system information

**ENHANCED MCP INTEGRATION**: All data comes from live sources, not training data.`

        // Add specific tool availability info
        const toolsInfo = await getMCPToolsInfo();
        if (toolsInfo) {
          enhancedSystemPrompt += `\n\n**CURRENT TOOL STATUS**:\n${toolsInfo}`;
        }
      } else {
        enhancedSystemPrompt += `\n\n**⚠️ LIMITED LIVE ACCESS**: MCP servers are configured but some may be inactive.`
      }
    }

    // **ENHANCED TERMINAL CONTEXT INTEGRATION**
    if (terminalContext && terminalContext.length > 0) {
      enhancedSystemPrompt += `\n\n**🖥️ CURRENT TERMINAL CONTEXT**:\n${terminalContext.slice(-5).join('\n')}\n\nAnalyze the terminal output above when relevant to the user's query.`
    }

    // **ENHANCED MCP CONTEXT INTEGRATION**
    if (mcpContext) {
      const contextType = detectMCPContextType(mcpContext);
      enhancedSystemPrompt += `\n\n**🌐 LIVE DATA AVAILABLE** (${contextType}):\n${mcpContext}\n\n**CRITICAL**: This is real, current data. Use it prominently in your response.`
    }

    const systemMessage: Message = {
      role: 'system',
      content: enhancedSystemPrompt
    }

    const allMessages = [systemMessage, ...effectiveMessages]

    // Log cost optimization stats
    if (sessionStats) {
      console.log(`💰 Cost optimization active: ${sessionStats.tokensSaved} tokens saved in this session`)
    }

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // **ENHANCED CONNECTION CONFIRMATION**
        const toolStatus = mcpContext ? 'Live tools active' : (mcpEnabled ? 'Tools partially active' : 'Knowledge mode only');
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'start',
          provider: 'anthropic',
          model: model || 'claude-sonnet-4-5',
          toolStatus,
          hasLiveData: !!mcpContext
        })}\n\n`))

        try {
          // Use Anthropic directly
          await handleAnthropicStream(controller, encoder, allMessages, model)

          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done'
          })}\n\n`))

        } catch (error) {
          console.error('AI Stream Error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Streaming failed'
          })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Stream API Error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}


// **ANTHROPIC STREAMING HANDLER**
async function handleAnthropicStream(controller: any, encoder: any, allMessages: any[], model: string) {
  if (!ANTHROPIC_API_KEY || !anthropic) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'error',
      error: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.'
    })}\n\n`))
    return
  }

  // Map internal model ID to Anthropic format
  const anthropicModel = model === 'claude-sonnet-4-5' ? 'claude-sonnet-4-20250514' : 'claude-sonnet-4-20250514'

  console.log(`[Anthropic] Model: ${anthropicModel}`)
  console.log(`[Anthropic] System prompt length: ${allMessages[0].content.length} chars (~${Math.ceil(allMessages[0].content.length / 4)} tokens)`)

  try {
    // Separate system message from conversation messages
    const systemMessage = allMessages.find((m: Message) => m.role === 'system')
    const conversationMessages = allMessages.filter((m: Message) => m.role !== 'system')

    // **CRITICAL: Validate and filter messages for Anthropic API**
    // Anthropic requires all messages to have non-empty content
    const validatedMessages = conversationMessages
      .filter((m: Message) => {
        // Must have content that's not empty or whitespace-only
        const hasContent = m.content && typeof m.content === 'string' && m.content.trim().length > 0
        if (!hasContent) {
          console.warn(`⚠️ Filtering out empty message: role=${m.role}, content="${m.content}"`)
        }
        return hasContent
      })
      .map((m: Message) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.trim()
      }))

    // Ensure we have at least one message
    if (validatedMessages.length === 0) {
      throw new Error('No valid messages to send. All messages had empty content.')
    }

    // Log for debugging
    console.log(`[Anthropic] Sending ${validatedMessages.length} validated messages`)
    validatedMessages.forEach((m, i) => {
      console.log(`  [${i}] ${m.role}: ${m.content.substring(0, 50)}${m.content.length > 50 ? '...' : ''}`)
    })

    // Create streaming request
    const stream = await anthropic.messages.stream({
      model: anthropicModel,
      max_tokens: 8192,
      temperature: 0.4,
      system: systemMessage?.content || '',
      messages: validatedMessages
    })

    // Process the stream
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        const delta = chunk.delta
        if (delta.type === 'text_delta' && delta.text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'content',
            content: delta.text
          })}\n\n`))
        }
      }
    }

  } catch (error: any) {
    console.error('Anthropic streaming error:', error)
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Anthropic streaming failed'
    
    if (error.status === 400) {
      if (error.message?.includes('empty content')) {
        errorMessage = 'Message validation failed: Some messages have empty content. Please ensure all messages have text.'
      } else if (error.message?.includes('invalid_request_error')) {
        errorMessage = `API validation error: ${error.error?.error?.message || error.message}`
      }
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed: Invalid API key. Please check your ANTHROPIC_API_KEY.'
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.'
    } else if (error.status === 500) {
      errorMessage = 'Anthropic API server error. Please try again later.'
    }
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'error',
      error: errorMessage
    })}\n\n`))
  }
}


// **UTILITY FUNCTIONS**
async function getMCPToolsInfo(): Promise<string | null> {
  try {
    const mcpServers = [
      {
        name: 'Context7 Documentation',
        category: 'Documentation',
        tools: ['resolve-library-id', 'get-library-docs']
      },
      {
        name: 'Web Search & Scraping',
        category: 'Web',
        tools: ['web_search', 'scrape_page', 'get_page_content']
      },
      {
        name: 'Advanced Web Automation',
        category: 'Web',
        tools: ['scrape_website', 'take_screenshot', 'extract_data', 'navigate_page']
      },
      {
        name: 'File System Operations',
        category: 'Development',
        tools: ['read_file', 'list_directory', 'search_files']
      },
      {
        name: 'Terminal Operations',
        category: 'System',
        tools: ['execute_command', 'get_environment']
      }
    ];

    const toolsInfo = mcpServers.map(server =>
      `• **${server.name}** (${server.category}): ${server.tools.join(', ')}`
    ).join('\n');

    return `Active Tools (${mcpServers.length} servers):\n${toolsInfo}`;
  } catch (error) {
    console.error('Failed to get MCP tools info:', error);
  }

  return null;
}

function detectMCPContextType(mcpContext: string): string {
  if (mcpContext.includes('Context7')) return 'Documentation';
  if (mcpContext.includes('Web Search')) return 'Web Intelligence';
  if (mcpContext.includes('Puppeteer')) return 'Web Automation';
  if (mcpContext.includes('Filesystem')) return 'Project Analysis';
  if (mcpContext.includes('Terminal')) return 'System Information';
  if (mcpContext.includes('Available Tools')) return 'Tool Discovery';

  return 'Live Data';
}
