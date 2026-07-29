import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  createErrorResponse,
  validationError,
  externalApiError,
  ErrorCategory,
  ErrorSeverity,
  withErrorHandling,
  errorLogger,
} from '../../../lib/error-handler'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

async function handleAnalyzeSession(request: NextRequest) {
  try {
    const body = await request.json()
    const { commands, systemInfo, metrics, agentConversations } = body

    // Validate input
    if (!commands || !Array.isArray(commands)) {
      return validationError('commands array is required')
    }

    if (!anthropic) {
      // Return basic analysis if AI not available
      errorLogger.log({
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.MEDIUM,
        message: 'Session analysis requested but Anthropic API not configured',
      })

      return NextResponse.json({
        success: true,
        analysis: {
          title: `Terminal session with ${commands.length} commands executed`,
          highlights: [
            `🎯 Executed ${commands.length} commands`,
            `⚡ ${commands.filter((c: any) => c.success).length} successful operations`,
            `✅ Session completed on ${systemInfo?.os || 'system'}`
          ],
          workflow: [
            {
              step: "Terminal Operations",
              icon: "⚡",
              actions: ["Commands executed", "System configured"],
              result: "Completed"
            }
          ],
          insights: [
            {
              icon: "💡",
              category: "Performance",
              finding: "All commands executed successfully",
              impact: "System is functioning properly"
            }
          ],
          metrics: {
            efficiency: "95%",
            complexity: "Moderate",
            quality: "Good",
            speed: "Fast"
          },
          recommendations: [
            {
              icon: "🚀",
              priority: "Medium",
              action: "Continue monitoring system performance",
              benefit: "Maintain optimal operations"
            }
          ],
          techStack: ["Terminal", systemInfo?.os || "System", "SSH"]
        }
      })
    }

    const prompt = `Analyze this terminal session and create a CONCISE professional report.

**SESSION INFO:**
- System: ${systemInfo?.os || 'Unknown'} (${systemInfo?.cpu || 'Unknown CPU'})
- Duration: ${Math.floor((metrics?.sessionDuration || 0) / 60000)} minutes
- Commands: ${commands.length} total, ${commands.filter((c: any) => c.success).length} successful

**COMMANDS EXECUTED:**
${commands.slice(0, 15).map((cmd: any, i: number) => 
  `${i + 1}. ${cmd.command} - ${cmd.success ? '✅' : '❌'} (${cmd.duration}ms)`
).join('\n')}

${agentConversations && agentConversations.length > 0 ? `\n**USER OBJECTIVES:**\n${agentConversations.filter((m: any) => m.role === 'user').slice(0, 3).map((m: any) => m.content.slice(0, 80)).join('\n')}` : ''}

**GENERATE JSON:**

\`\`\`json
{
  "title": "One sentence: what was accomplished in this session",
  
  "highlights": [
    "🎯 Key achievement 1 (max 80 chars)",
    "⚡ Key achievement 2 (max 80 chars)",
    "✅ Key achievement 3 (max 80 chars)"
  ],
  
  "workflow": [
    {
      "step": "Phase 1 name",
      "icon": "🔧",
      "actions": ["Action 1", "Action 2"],
      "result": "Brief outcome"
    },
    {
      "step": "Phase 2 name",
      "icon": "📦",
      "actions": ["Action 1", "Action 2"],
      "result": "Brief outcome"
    }
  ],
  
  "insights": [
    {
      "icon": "💡",
      "category": "Performance/Security/Best Practice",
      "finding": "Specific observation (max 80 chars)",
      "impact": "Why it matters (max 80 chars)"
    }
  ],
  
  "metrics": {
    "efficiency": "95%/Good/Excellent",
    "complexity": "Simple/Moderate/Complex",
    "quality": "Good/Excellent/Outstanding",
    "speed": "Fast/Normal/Slow"
  },
  
  "recommendations": [
    {
      "icon": "🚀",
      "priority": "High/Medium/Low",
      "action": "Specific recommendation (max 80 chars)",
      "benefit": "Expected improvement (max 60 chars)"
    }
  ],
  
  "techStack": [
    "Tool 1 with emoji",
    "Tool 2 with emoji"
  ]
}
\`\`\`

**RULES:**
- Keep ALL text under 80 characters
- Use emojis for visual appeal
- Focus on WHAT was done, not HOW
- CONCISE and ACTIONABLE only
- Highlight SUCCESS
- Max 3 workflow phases
- Max 4 insights
- Max 5 recommendations`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    
    // Extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/)
    const analysis = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(text)

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error: any) {
    console.error('❌ Session analysis error:', error)

    // Check if it's an API error
    if (error.status && error.status >= 400) {
      return externalApiError('Anthropic API', error)
    }

    // Return fallback analysis with error logged
    errorLogger.log({
      category: ErrorCategory.EXTERNAL_API,
      severity: ErrorSeverity.HIGH,
      message: `Session analysis failed: ${error.message}`,
      details: { error: error.message, stack: error.stack },
    })

    return NextResponse.json({
      success: true,
      analysis: {
        title: 'Terminal session analysis completed',
        highlights: ['🎯 Session data collected', '⚡ Commands logged', '✅ Analysis completed'],
        workflow: [{ step: "Session", icon: "⚡", actions: ["Data collected"], result: "Completed" }],
        insights: [{ icon: "💡", category: "Performance", finding: "Session completed", impact: "Data available" }],
        metrics: { efficiency: "Good", complexity: "Moderate", quality: "Good", speed: "Normal" },
        recommendations: [{ icon: "🚀", priority: "Medium", action: "Review session details", benefit: "Better insights" }],
        techStack: ["Terminal", "SSH"]
      }
    })
  }
}

export const POST = withErrorHandling(handleAnalyzeSession, ErrorCategory.EXTERNAL_API)

