// Semantic Search - Find relevant code using embeddings
// Can run on both client and server

import { embedCode } from './code-embeddings'
import { searchRelevantCode, searchByFileType, searchByCodeType } from './vector-store'

export interface SearchResult {
  file: string
  content: string
  startLine: number
  endLine: number
  language: string
  type: string
  score: number
  relevanceReason?: string
}

/**
 * Find code relevant to user query using semantic search
 * This is the main function to use before sending context to AI
 */
export async function findRelevantCodeForQuery(
  userQuery: string,
  limit: number = 10,
  fileTypeFilter?: string[]
): Promise<SearchResult[]> {
  try {
    console.log(`🔍 Semantic search for: "${userQuery}"`)
    
    // Generate query embedding
    const queryEmbedding = await embedCode(userQuery)
    
    // Search vector DB
    let results
    if (fileTypeFilter && fileTypeFilter.length > 0) {
      results = await searchByFileType(queryEmbedding, fileTypeFilter, limit)
    } else {
      results = await searchRelevantCode(userQuery, queryEmbedding, limit)
    }
    
    // Format results
    const searchResults: SearchResult[] = results.map(r => ({
      file: r.file,
      content: r.content,
      startLine: r.startLine,
      endLine: r.endLine,
      language: r.language,
      type: r.type,
      score: r.score,
      relevanceReason: generateRelevanceReason(userQuery, r)
    }))
    
    console.log(`✅ Found ${searchResults.length} relevant code snippets`)
    return searchResults
    
  } catch (error) {
    console.error('❌ Semantic search failed:', error)
    return []
  }
}

/**
 * Find functions related to query
 */
export async function findRelevantFunctions(query: string, limit: number = 5): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await embedCode(query)
    const results = await searchByCodeType(queryEmbedding, ['function'], limit)
    
    return results.map(r => ({
      file: r.file,
      content: r.content,
      startLine: r.startLine,
      endLine: r.endLine,
      language: r.language,
      type: r.type,
      score: r.score
    }))
  } catch (error) {
    console.error('❌ Function search failed:', error)
    return []
  }
}

/**
 * Find components related to query
 */
export async function findRelevantComponents(query: string, limit: number = 5): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await embedCode(query)
    const results = await searchByCodeType(queryEmbedding, ['component'], limit)
    
    return results.map(r => ({
      file: r.file,
      content: r.content,
      startLine: r.startLine,
      endLine: r.endLine,
      language: r.language,
      type: r.type,
      score: r.score
    }))
  } catch (error) {
    console.error('❌ Component search failed:', error)
    return []
  }
}

/**
 * Generate explanation for why code is relevant
 */
function generateRelevanceReason(query: string, result: any): string {
  const queryWords = query.toLowerCase().split(/\s+/)
  const contentLower = result.content.toLowerCase()
  
  const matches = queryWords.filter(word => contentLower.includes(word))
  
  if (matches.length > 0) {
    return `Contains: ${matches.join(', ')}`
  }
  
  return `Semantically related (score: ${result.score.toFixed(3)})`
}

/**
 * Build context string from search results for AI
 */
export function buildCodeContext(results: SearchResult[]): string {
  if (results.length === 0) return ''
  
  const context = results.map((r, idx) => {
    return `
**Relevant Code ${idx + 1}** (${r.file}:${r.startLine}-${r.endLine})
Language: ${r.language} | Type: ${r.type} | Relevance: ${(r.score * 100).toFixed(1)}%

\`\`\`${r.language}
${r.content}
\`\`\`
`
  }).join('\n---\n')
  
  return `
## Relevant Code from Codebase (Semantic Search)

${context}
`
}

export default {
  findRelevantCodeForQuery,
  findRelevantFunctions,
  findRelevantComponents,
  buildCodeContext
}

