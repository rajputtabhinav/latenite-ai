import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllSessions,
  checkSessionHealth,
  cleanupSession,
  validateSessionWithCommand
} from '../../../lib/ssh-session-manager'

// SSH Health Monitoring and Connection Status
// Based on web research for SSH connection monitoring best practices

interface HealthStatus {
  sessionId: string
  host: string
  username: string
  connected: boolean
  lastActivity: string
  age: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  issues: string[]
  authMethod?: string
}

interface SystemHealth {
  totalSessions: number
  healthySessions: number
  unhealthySessions: number
  degradedSessions: number
  overall: 'healthy' | 'degraded' | 'critical'
  recommendations: string[]
  lastCheck: string
}

// Check individual session health
async function checkIndividualSessionHealth(sessionId: string, session: any): Promise<HealthStatus> {
  const issues: string[] = []
  let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
  
  // Basic connection check
  const isBasicallyHealthy = checkSessionHealth(sessionId)
  if (!isBasicallyHealthy) {
    status = 'unhealthy'
    issues.push('Connection is not responsive')
  }
  
  // Age check - warn if session is very old
  const ageMs = Date.now() - session.createdAt
  const ageHours = ageMs / (1000 * 60 * 60)
  
  if (ageHours > 12) {
    if (status === 'healthy') status = 'degraded'
    issues.push(`Session is ${Math.round(ageHours)} hours old - consider reconnecting`)
  }
  
  // Activity check - warn if no recent activity
  const inactiveMs = Date.now() - session.lastActivity
  const inactiveMinutes = inactiveMs / (1000 * 60)
  
  if (inactiveMinutes > 120) { // 2 hours
    if (status === 'healthy') status = 'degraded'
    issues.push(`No activity for ${Math.round(inactiveMinutes)} minutes`)
  }
  
  // Advanced validation for healthy sessions
  if (status === 'healthy') {
    const isValid = await validateSessionWithCommand(sessionId)
    if (!isValid) {
      status = 'degraded'
      issues.push('Session failed validation test')
    }
  }
  
  return {
    sessionId,
    host: session.host,
    username: session.username,
    connected: session.connected,
    lastActivity: new Date(session.lastActivity).toISOString(),
    age: `${Math.round(ageHours * 10) / 10}h`,
    status,
    issues,
    authMethod: session.authMethod
  }
}

// Check overall system health
async function checkSystemHealth(): Promise<SystemHealth> {
  const allSessions = getAllSessions()
  const healthChecks = await Promise.all(
    allSessions.map(({ sessionId, session }) => 
      checkIndividualSessionHealth(sessionId, session)
    )
  )
  
  const totalSessions = healthChecks.length
  const healthySessions = healthChecks.filter(h => h.status === 'healthy').length
  const degradedSessions = healthChecks.filter(h => h.status === 'degraded').length
  const unhealthySessions = healthChecks.filter(h => h.status === 'unhealthy').length
  
  let overall: 'healthy' | 'degraded' | 'critical' = 'healthy'
  const recommendations: string[] = []
  
  if (unhealthySessions > 0) {
    overall = totalSessions > 1 ? 'degraded' : 'critical'
    recommendations.push(`${unhealthySessions} unhealthy sessions need reconnection`)
  }
  
  if (degradedSessions > totalSessions / 2) {
    overall = overall === 'healthy' ? 'degraded' : overall
    recommendations.push('Many sessions are degraded - consider reconnecting old sessions')
  }
  
  if (totalSessions === 0) {
    recommendations.push('No active SSH sessions')
  } else if (totalSessions > 10) {
    recommendations.push('High number of active sessions - monitor resource usage')
  }
  
  // Add web research-based recommendations
  if (degradedSessions > 0 || unhealthySessions > 0) {
    recommendations.push('Based on SSH best practices:')
    recommendations.push('- Check ServerAliveInterval and ClientAliveInterval settings')
    recommendations.push('- Monitor network stability for broken pipe errors')
    recommendations.push('- Consider using SSH multiplexing for multiple connections')
  }
  
  return {
    totalSessions,
    healthySessions,
    unhealthySessions,
    degradedSessions,
    overall,
    recommendations,
    lastCheck: new Date().toISOString()
  }
}

// Clean up unhealthy sessions
async function performHealthMaintenance(): Promise<{ cleaned: number; kept: number }> {
  const allSessions = getAllSessions()
  let cleaned = 0
  let kept = 0
  
  for (const { sessionId, session } of allSessions) {
    const health = await checkIndividualSessionHealth(sessionId, session)
    
    if (health.status === 'unhealthy') {
      console.log(`🧹 Cleaning up unhealthy session: ${sessionId}`)
      cleanupSession(sessionId)
      cleaned++
    } else {
      kept++
    }
  }
  
  return { cleaned, kept }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    
    if (action === 'detailed') {
      // Detailed health check for all sessions
      const allSessions = getAllSessions()
      const detailedChecks = await Promise.all(
        allSessions.map(({ sessionId, session }) => 
          checkIndividualSessionHealth(sessionId, session)
        )
      )
      
      const systemHealth = await checkSystemHealth()
      
      return NextResponse.json({
        success: true,
        message: 'Detailed SSH health check completed',
        system: systemHealth,
        sessions: detailedChecks,
        timestamp: new Date().toISOString()
      })
      
    } else if (action === 'maintenance') {
      // Perform health maintenance
      const result = await performHealthMaintenance()
      const updatedHealth = await checkSystemHealth()
      
      return NextResponse.json({
        success: true,
        message: `Health maintenance completed - cleaned ${result.cleaned} sessions, kept ${result.kept}`,
        maintenance: result,
        health: updatedHealth,
        timestamp: new Date().toISOString()
      })
      
    } else {
      // Basic health overview
      const systemHealth = await checkSystemHealth()
      
      return NextResponse.json({
        success: true,
        message: 'SSH health check completed',
        health: systemHealth,
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error: any) {
    console.error('SSH health check error:', error)
    return NextResponse.json({
      success: false,
      message: 'Health check failed: ' + error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: 'Session ID is required for individual health check'
      }, { status: 400 })
    }
    
    const allSessions = getAllSessions()
    const targetSession = allSessions.find(s => s.sessionId === sessionId)
    
    if (!targetSession) {
      return NextResponse.json({
        success: false,
        message: `Session ${sessionId} not found`
      }, { status: 404 })
    }
    
    const health = await checkIndividualSessionHealth(sessionId, targetSession.session)
    
    return NextResponse.json({
      success: true,
      message: `Health check completed for session ${sessionId}`,
      health,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Individual health check error:', error)
    return NextResponse.json({
      success: false,
      message: 'Individual health check failed: ' + error.message
    }, { status: 500 })
  }
}