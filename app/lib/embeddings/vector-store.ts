// Vector Store - Qdrant integration for semantic code search
// Can run on both client and server

import { QdrantClient } from '@qdrant/js-client-rest'
import { EmbeddedCode } from './code-embeddings'

const COLLECTION_NAME = 'latenite-codebase'
const VECTOR_SIZE = 3072 // OpenAI text-embedding-3-large dimension

// Singleton Qdrant client
let qdrantClient: QdrantClient | null = null

function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    // Default to localhost, can be configured via env
    const url = process.env.NEXT_PUBLIC_QDRANT_URL || 'http://localhost:6333'
    qdrantClient = new QdrantClient({ url })
  }
  return qdrantClient
}

/**
 * Initialize Qdrant collection if it doesn't exist
 */
export async function initializeVectorStore(): Promise<boolean> {
  try {
    const client = getQdrantClient()
    
    // Check if collection exists
    const collections = await client.getCollections()
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME)
    
    if (!exists) {
      console.log('📦 Creating Qdrant collection:', COLLECTION_NAME)
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine'
        },
        optimizers_config: {
          default_segment_number: 2
        },
        replication_factor: 1
      })
      console.log('✅ Qdrant collection created successfully')
    } else {
      console.log('✅ Qdrant collection already exists')
    }
    
    return true
  } catch (error) {
    console.error('❌ Failed to initialize vector store:', error)
    return false
  }
}

/**
 * Store embedded code chunks in vector database
 */
export async function storeCodeEmbeddings(embeddedCodes: EmbeddedCode[]): Promise<void> {
  try {
    const client = getQdrantClient()
    
    const points = embeddedCodes.map(code => ({
      id: code.id,
      vector: code.embedding,
      payload: {
        content: code.content,
        file: code.file,
        startLine: code.startLine,
        endLine: code.endLine,
        language: code.language,
        type: code.type,
        fileName: code.metadata.fileName,
        fileExtension: code.metadata.fileExtension,
        charCount: code.metadata.charCount,
        tokenEstimate: code.metadata.tokenEstimate
      }
    }))
    
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points
    })
    
    console.log(`✅ Stored ${points.length} code embeddings in vector DB`)
  } catch (error) {
    console.error('❌ Failed to store embeddings:', error)
    throw error
  }
}

/**
 * Semantic search for relevant code
 */
export async function searchRelevantCode(
  query: string,
  queryEmbedding: number[],
  limit: number = 5,
  filter?: any
): Promise<Array<EmbeddedCode & { score: number }>> {
  try {
    const client = getQdrantClient()
    
    const searchResult = await client.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit,
      filter,
      with_payload: true,
      with_vector: false
    })
    
    return searchResult.map(result => ({
      id: result.id as string,
      content: result.payload?.content as string,
      file: result.payload?.file as string,
      startLine: result.payload?.startLine as number,
      endLine: result.payload?.endLine as number,
      language: result.payload?.language as string,
      type: result.payload?.type as any,
      embedding: [], // Don't return large vectors
      metadata: {
        fileName: result.payload?.fileName as string,
        fileExtension: result.payload?.fileExtension as string,
        charCount: result.payload?.charCount as number,
        tokenEstimate: result.payload?.tokenEstimate as number
      },
      score: result.score || 0
    }))
  } catch (error) {
    console.error('❌ Search failed:', error)
    throw error
  }
}

/**
 * Search by file type/language
 */
export async function searchByFileType(
  queryEmbedding: number[],
  fileTypes: string[],
  limit: number = 5
): Promise<Array<EmbeddedCode & { score: number }>> {
  const filter = {
    should: fileTypes.map(type => ({
      key: 'fileExtension',
      match: { value: type }
    }))
  }
  
  return searchRelevantCode('', queryEmbedding, limit, filter)
}

/**
 * Search by code type (function, class, etc.)
 */
export async function searchByCodeType(
  queryEmbedding: number[],
  codeTypes: Array<'function' | 'class' | 'component' | 'interface'>,
  limit: number = 5
): Promise<Array<EmbeddedCode & { score: number }>> {
  const filter = {
    should: codeTypes.map(type => ({
      key: 'type',
      match: { value: type }
    }))
  }
  
  return searchRelevantCode('', queryEmbedding, limit, filter)
}

/**
 * Delete embeddings for a specific file (for re-indexing)
 */
export async function deleteFileEmbeddings(filePath: string): Promise<void> {
  try {
    const client = getQdrantClient()
    
    await client.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must: [{
          key: 'file',
          match: { value: filePath }
        }]
      }
    })
    
    console.log(`🗑️ Deleted embeddings for: ${filePath}`)
  } catch (error) {
    console.error('❌ Failed to delete embeddings:', error)
  }
}

/**
 * Get collection stats
 */
export async function getVectorStoreStats(): Promise<{
  totalVectors: number
  indexedFiles: number
  storageSize: number
}> {
  try {
    const client = getQdrantClient()
    const info = await client.getCollection(COLLECTION_NAME)
    
    return {
      totalVectors: info.points_count || 0,
      indexedFiles: info.points_count || 0, // Approximate
      storageSize: info.vectors_count || 0
    }
  } catch (error) {
    console.error('❌ Failed to get stats:', error)
    return { totalVectors: 0, indexedFiles: 0, storageSize: 0 }
  }
}

/**
 * Clear entire collection (use with caution!)
 */
export async function clearVectorStore(): Promise<void> {
  try {
    const client = getQdrantClient()
    await client.deleteCollection(COLLECTION_NAME)
    await initializeVectorStore()
    console.log('🗑️ Vector store cleared and re-initialized')
  } catch (error) {
    console.error('❌ Failed to clear vector store:', error)
    throw error
  }
}

export default {
  initializeVectorStore,
  storeCodeEmbeddings,
  searchRelevantCode,
  searchByFileType,
  searchByCodeType,
  deleteFileEmbeddings,
  getVectorStoreStats,
  clearVectorStore
}

