import { NextRequest, NextResponse } from 'next/server'
import { getGlobalMemory } from '../../../lib/conversation-memory'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 })
    }

    const memory = getGlobalMemory()
    const context = await memory.getContextForQuery(query)

    return NextResponse.json({
      success: true,
      context
    })

  } catch (error: any) {
    console.error('Memory query error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      context: 'No conversation history available'
    }, { status: 500 })
  }
}
