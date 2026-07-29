// Code Embeddings System - Transform code into semantic vectors
// Can run on both client and server

import OpenAI from 'openai'

// Singleton OpenAI client for embeddings
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key required for embeddings. Set OPENAI_API_KEY in .env')
    }
    openaiClient = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  }
  return openaiClient
}

export interface CodeChunk {
  content: string
  file: string
  startLine: number
  endLine: number
  language: string
  type: 'function' | 'class' | 'component' | 'interface' | 'type' | 'variable' | 'import' | 'other'
}

export interface EmbeddedCode extends CodeChunk {
  embedding: number[]
  id: string
  metadata: {
    fileName: string
    fileExtension: string
    charCount: number
    tokenEstimate: number
  }
}

/**
 * Generate embedding for code snippet
 * Uses OpenAI's text-embedding-3-large model (3072 dimensions)
 */
export async function embedCode(code: string): Promise<number[]> {
  try {
    const client = getOpenAIClient()
    
    // Truncate if too long (max 8191 tokens for embedding model)
    const truncated = code.substring(0, 30000)
    
    const response = await client.embeddings.create({
      model: "text-embedding-3-large",
      input: truncated,
      encoding_format: "float"
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('❌ Embedding generation failed:', error)
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Generate embeddings for multiple code chunks in batch
 * More efficient than individual calls
 */
export async function embedCodeBatch(chunks: CodeChunk[]): Promise<EmbeddedCode[]> {
  try {
    const client = getOpenAIClient()
    
    // Prepare inputs
    const inputs = chunks.map(chunk => chunk.content.substring(0, 30000))
    
    // Batch embedding request (max 2048 inputs per request)
    const batchSize = 100
    const results: EmbeddedCode[] = []
    
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize)
      const batchChunks = chunks.slice(i, i + batchSize)
      
      console.log(`📦 Embedding batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(inputs.length/batchSize)} (${batch.length} chunks)`)
      
      const response = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: batch,
        encoding_format: "float"
      })
      
      // Combine embeddings with chunks
      batchChunks.forEach((chunk, idx) => {
        results.push({
          ...chunk,
          embedding: response.data[idx].embedding,
          id: `${chunk.file}:${chunk.startLine}-${chunk.endLine}`,
          metadata: {
            fileName: chunk.file.split('/').pop() || chunk.file,
            fileExtension: chunk.file.split('.').pop() || 'unknown',
            charCount: chunk.content.length,
            tokenEstimate: Math.ceil(chunk.content.length / 4) // Rough estimate
          }
        })
      })
    }
    
    return results
  } catch (error) {
    console.error('❌ Batch embedding failed:', error)
    throw new Error(`Batch embedding failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Parse code file into semantic chunks
 * Splits by functions, classes, components
 */
export function parseCodeIntoChunks(content: string, filePath: string): CodeChunk[] {
  const chunks: CodeChunk[] = []
  const lines = content.split('\n')
  const language = getLanguageFromPath(filePath)
  
  // Simple parsing - can be enhanced with AST parsing later
  let currentChunk: string[] = []
  let chunkStartLine = 0
  let chunkType: CodeChunk['type'] = 'other'
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Detect chunk boundaries
    if (
      trimmed.startsWith('function ') ||
      trimmed.startsWith('const ') && trimmed.includes(' = (') ||
      trimmed.startsWith('async function') ||
      trimmed.startsWith('export function') ||
      trimmed.startsWith('export const') && trimmed.includes(' = (')
    ) {
      // Save previous chunk
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join('\n'),
          file: filePath,
          startLine: chunkStartLine,
          endLine: i - 1,
          language,
          type: chunkType
        })
      }
      
      // Start new chunk
      currentChunk = [line]
      chunkStartLine = i
      chunkType = 'function'
    } else if (
      trimmed.startsWith('class ') ||
      trimmed.startsWith('export class')
    ) {
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join('\n'),
          file: filePath,
          startLine: chunkStartLine,
          endLine: i - 1,
          language,
          type: chunkType
        })
      }
      currentChunk = [line]
      chunkStartLine = i
      chunkType = 'class'
    } else if (
      trimmed.startsWith('interface ') ||
      trimmed.startsWith('export interface')
    ) {
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join('\n'),
          file: filePath,
          startLine: chunkStartLine,
          endLine: i - 1,
          language,
          type: chunkType
        })
      }
      currentChunk = [line]
      chunkStartLine = i
      chunkType = 'interface'
    } else {
      currentChunk.push(line)
    }
    
    // Create chunk every 100 lines max (prevent huge chunks)
    if (currentChunk.length >= 100) {
      chunks.push({
        content: currentChunk.join('\n'),
        file: filePath,
        startLine: chunkStartLine,
        endLine: i,
        language,
        type: chunkType
      })
      currentChunk = []
      chunkStartLine = i + 1
      chunkType = 'other'
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join('\n'),
      file: filePath,
      startLine: chunkStartLine,
      endLine: lines.length - 1,
      language,
      type: chunkType
    })
  }
  
  return chunks
}

/**
 * Get programming language from file path
 */
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin'
  }
  
  return langMap[ext || ''] || 'unknown'
}

/**
 * Calculate similarity between two embedding vectors
 * Returns cosine similarity (0-1, higher = more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export default {
  embedCode,
  embedCodeBatch,
  parseCodeIntoChunks,
  cosineSimilarity
}

