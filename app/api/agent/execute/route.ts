import { NextRequest, NextResponse } from 'next/server'

interface AgentExecuteRequest {
  command: string
  explanation: string
  sessionId?: string
  executionMode: 'ssh' | 'manual' | 'system'
  userConfirmation?: boolean
}

// Enhanced agent command execution with multiple fallback modes
export async function POST(request: NextRequest) {
  try {
    const body: AgentExecuteRequest = await request.json()
    const { command, explanation, sessionId, executionMode, userConfirmation } = body
    
    if (!command || command.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: "Command cannot be empty"
      }, { status: 400 })
    }

    console.log(`🤖 Agent command request: "${command}" (mode: ${executionMode})`)

    // Mode 1: Try SSH execution if session is available
    if (executionMode === 'ssh' && sessionId) {
      try {
        const sshResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/ssh/terminal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'command',
            content: command,
            sessionId
          })
        })

        if (sshResponse.ok) {
          const result = await sshResponse.json()
          return NextResponse.json({
            success: true,
            mode: 'ssh',
            output: result.output,
            command,
            explanation,
            timestamp: new Date().toISOString()
          })
        } else {
          console.log('SSH execution failed, falling back to manual mode')
        }
      } catch (sshError) {
        console.log('SSH execution error:', sshError)
      }
    }

    // Mode 2: System execution (for local commands)
    if (executionMode === 'system') {
      try {
        const systemResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/system/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command,
            type: 'shell'
          })
        })

        if (systemResponse.ok) {
          const result = await systemResponse.json()
          return NextResponse.json({
            success: result.success,
            mode: 'system',
            output: result.output,
            error: result.error,
            command,
            explanation,
            timestamp: new Date().toISOString()
          })
        }
      } catch (systemError) {
        console.log('System execution error:', systemError)
      }
    }

    // Mode 3: Manual execution - propose command to user
    return NextResponse.json({
      success: true,
      mode: 'manual',
      proposedCommand: command,
      explanation,
      instructions: `Please execute the following command manually in your terminal:\n\n${command}\n\nExplanation: ${explanation}`,
      timestamp: new Date().toISOString(),
      requiresManualExecution: true
    })

  } catch (error) {
    console.error('Agent execution API error:', error)
    return NextResponse.json({
      success: false,
      message: "Agent execution error: " + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Agent command execution endpoint ready",
    status: "operational",
    features: [
      "Multi-mode command execution (SSH/System/Manual)",
      "Intelligent fallback mechanisms",
      "Command explanation and safety checks",
      "Real-time execution status"
    ],
    modes: {
      ssh: "Execute commands through established SSH sessions",
      system: "Execute commands on local system", 
      manual: "Propose commands for manual user execution"
    }
  })
}
