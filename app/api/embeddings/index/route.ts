// Codebase Indexing API - Trigger indexing from UI or scripts
import { NextRequest, NextResponse } from 'next/server'
import {
  createErrorResponse,
  validationError,
  ErrorCategory,
  ErrorSeverity,
  withErrorHandling,
  errorLogger,
} from '../../../lib/error-handler'

async function handleIndexPost(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, filePath } = body

    // Validate action
    if (!action) {
      return validationError('Action is required', {
        validActions: ['index', 'reindex', 'status'],
      })
    }

    if (action === 'index') {
      // Full codebase indexing
      console.log('🚀 Starting codebase indexing via API...')

      errorLogger.log({
        category: ErrorCategory.INTERNAL,
        severity: ErrorSeverity.LOW,
        message: 'Starting full codebase indexing',
      })

      // Import dynamically to avoid client-side execution
      const { indexCodebase } = await import('../../../lib/embeddings/codebase-indexer')

      // Start indexing (this will take time)
      const result = await indexCodebase('.', (progress) => {
        console.log(
          `Progress: ${progress.filesProcessed}/${progress.totalFiles} - ${progress.currentFile || 'Processing...'
          }`
        )
      })

      errorLogger.log({
        category: ErrorCategory.INTERNAL,
        severity: ErrorSeverity.LOW,
        message: 'Codebase indexing completed successfully',
        details: result,
      })

      return NextResponse.json({
        message: 'Codebase indexed successfully',
        ...result,
      })
    } else if (action === 'reindex') {
      if (!filePath) {
        return validationError('filePath is required for reindex action')
      }

      // Re-index single file
      const { reindexFile } = await import('../../../lib/embeddings/codebase-indexer')

      await reindexFile(filePath)

      errorLogger.log({
        category: ErrorCategory.FILE_SYSTEM,
        severity: ErrorSeverity.LOW,
        message: `File re-indexed: ${filePath}`,
      })

      return NextResponse.json({
        success: true,
        message: `File ${filePath} re-indexed successfully`,
      })
    } else if (action === 'status') {
      // Get indexing status
      const { getIndexingStatus } = await import('../../../lib/embeddings/codebase-indexer')

      const status = await getIndexingStatus()

      return NextResponse.json({
        success: true,
        ...status,
      })
    } else {
      return validationError(`Invalid action: ${action}`, {
        validActions: ['index', 'reindex', 'status'],
        receivedAction: action,
      })
    }
  } catch (error: any) {
    console.error('❌ Indexing API error:', error)

    return createErrorResponse(
      error,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      500,
      {
        endpoint: '/api/embeddings/index',
        message: 'Indexing operation failed',
      }
    )
  }
}

async function handleIndexGet(request: NextRequest) {
  try {
    // Get indexing status
    const { getIndexingStatus } = await import('../../../lib/embeddings/codebase-indexer')
    const status = await getIndexingStatus()

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error) {
    console.error('❌ Get indexing status error:', error)

    return createErrorResponse(
      error,
      ErrorCategory.DATABASE,
      ErrorSeverity.MEDIUM,
      500,
      {
        endpoint: '/api/embeddings/index',
        message: 'Failed to get indexing status',
      }
    )
  }
}

export const POST = withErrorHandling(handleIndexPost, ErrorCategory.DATABASE)
export const GET = withErrorHandling(handleIndexGet, ErrorCategory.DATABASE)

