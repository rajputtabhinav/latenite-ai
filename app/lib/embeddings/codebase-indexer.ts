// Codebase Indexer - Automatically index entire project for semantic search
// SERVER-SIDE ONLY - Uses Node.js modules (glob, fs)

import { glob } from 'glob'
import { parseCodeIntoChunks, embedCodeBatch, type CodeChunk } from './code-embeddings'
import { initializeVectorStore, storeCodeEmbeddings, deleteFileEmbeddings, getVectorStoreStats } from './vector-store'

export interface IndexingProgress {
  status: 'idle' | 'indexing' | 'complete' | 'error'
  filesProcessed: number
  totalFiles: number
  chunksCreated: number
  currentFile?: string
  error?: string
}

export interface IndexingResult {
  success: boolean
  filesIndexed: number
  chunksCreated: number
  duration: number
  error?: string
}

/**
 * Index entire codebase
 * Scans all code files, generates embeddings, stores in vector DB
 */
export async function indexCodebase(
  rootPath: string = '.',
  onProgress?: (progress: IndexingProgress) => void
): Promise<IndexingResult> {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting codebase indexing...')
    
    // Initialize vector store
    await initializeVectorStore()
    
    // Find all code files
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.go',
      '**/*.rs',
      '**/*.java'
    ]
    
    const ignore = [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/*.min.js',
      '**/*.bundle.js'
    ]
    
    console.log('📁 Scanning for code files...')
    const files: string[] = []
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: rootPath, ignore })
      files.push(...matches)
    }
    
    const uniqueFiles = [...new Set(files)]
    console.log(`📊 Found ${uniqueFiles.length} code files to index`)
    
    if (onProgress) {
      onProgress({
        status: 'indexing',
        filesProcessed: 0,
        totalFiles: uniqueFiles.length,
        chunksCreated: 0
      })
    }
    
    // Process files in batches
    const batchSize = 10
    let totalChunks = 0
    
    for (let i = 0; i < uniqueFiles.length; i += batchSize) {
      const batch = uniqueFiles.slice(i, i + batchSize)
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueFiles.length/batchSize)}`)
      
      for (const file of batch) {
        try {
          if (onProgress) {
            onProgress({
              status: 'indexing',
              filesProcessed: i + batch.indexOf(file) + 1,
              totalFiles: uniqueFiles.length,
              chunksCreated: totalChunks,
              currentFile: file
            })
          }
          
          // Read file
          const response = await fetch(`/api/files/read?path=${encodeURIComponent(file)}`)
          if (!response.ok) {
            console.warn(`⚠️ Skipping ${file} - failed to read`)
            continue
          }
          
          const content = await response.text()
          
          // Parse into chunks
          const chunks = parseCodeIntoChunks(content, file)
          
          if (chunks.length === 0) {
            console.log(`⏭️ Skipping ${file} - no chunks`)
            continue
          }
          
          // Generate embeddings
          const embedded = await embedCodeBatch(chunks)
          
          // Store in vector DB
          await storeCodeEmbeddings(embedded)
          
          totalChunks += embedded.length
          console.log(`✅ Indexed ${file}: ${embedded.length} chunks`)
          
        } catch (error) {
          console.error(`❌ Failed to index ${file}:`, error)
        }
      }
    }
    
    const duration = Date.now() - startTime
    
    if (onProgress) {
      onProgress({
        status: 'complete',
        filesProcessed: uniqueFiles.length,
        totalFiles: uniqueFiles.length,
        chunksCreated: totalChunks
      })
    }
    
    console.log(`✅ Indexing complete!`)
    console.log(`   Files: ${uniqueFiles.length}`)
    console.log(`   Chunks: ${totalChunks}`)
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`)
    
    return {
      success: true,
      filesIndexed: uniqueFiles.length,
      chunksCreated: totalChunks,
      duration
    }
    
  } catch (error) {
    console.error('❌ Indexing failed:', error)
    
    if (onProgress) {
      onProgress({
        status: 'error',
        filesProcessed: 0,
        totalFiles: 0,
        chunksCreated: 0,
        error: error instanceof Error ? error.message : String(error)
      })
    }
    
    return {
      success: false,
      filesIndexed: 0,
      chunksCreated: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Re-index a single file (when it changes)
 */
export async function reindexFile(filePath: string): Promise<void> {
  try {
    console.log(`🔄 Re-indexing file: ${filePath}`)
    
    // Delete old embeddings
    await deleteFileEmbeddings(filePath)
    
    // Read file
    const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
    if (!response.ok) {
      throw new Error('Failed to read file')
    }
    
    const content = await response.text()
    
    // Parse and embed
    const chunks = parseCodeIntoChunks(content, filePath)
    const embedded = await embedCodeBatch(chunks)
    
    // Store
    await storeCodeEmbeddings(embedded)
    
    console.log(`✅ Re-indexed ${filePath}: ${embedded.length} chunks`)
  } catch (error) {
    console.error(`❌ Failed to re-index ${filePath}:`, error)
    throw error
  }
}

/**
 * Check if codebase is indexed
 */
export async function isCodebaseIndexed(): Promise<boolean> {
  try {
    const stats = await getVectorStoreStats()
    return stats.totalVectors > 0
  } catch (error) {
    return false
  }
}

/**
 * Get indexing status and stats
 */
export async function getIndexingStatus(): Promise<{
  isIndexed: boolean
  stats?: Awaited<ReturnType<typeof getVectorStoreStats>>
}> {
  try {
    const stats = await getVectorStoreStats()
    return {
      isIndexed: stats.totalVectors > 0,
      stats
    }
  } catch (error) {
    return { isIndexed: false }
  }
}

export default {
  indexCodebase,
  reindexFile,
  isCodebaseIndexed,
  getIndexingStatus
}

