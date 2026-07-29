import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../../lib/ssh-session-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: 'Session ID required'
      }, { status: 400 })
    }

    // Check if session exists and is active
    const session = getSession(sessionId)
    
    if (session && session.connected) {
      return NextResponse.json({
        success: true,
        active: true,
        sessionId,
        host: session.host,
        username: session.username,
        connectedAt: session.createdAt,
        lastActivity: session.lastActivity
      })
    } else {
      return NextResponse.json({
        success: true,
        active: false,
        message: 'Session not found or disconnected'
      })
    }
  } catch (error) {
    console.error('Session status check error:', error)
    return NextResponse.json({
      success: false,
      active: false,
      message: 'Failed to check session status'
    }, { status: 500 })
  }
}
