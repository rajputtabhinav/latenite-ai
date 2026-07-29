// File Reading API for codebase indexer
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }
    
    // Security: Prevent path traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.join(process.cwd(), safePath)
    
    // Ensure file is within project directory
    if (!fullPath.startsWith(process.cwd())) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Read file
    const content = await fs.readFile(fullPath, 'utf-8')
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('File read error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to read file'
    }, { status: 500 })
  }
}

