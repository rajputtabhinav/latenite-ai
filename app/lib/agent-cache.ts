// Server-side only - removed 'use client'
import crypto from 'crypto'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  hits: number
}

export class AgentCache {
  private promptCache: Map<string, CacheEntry<string>> = new Map()
  private responseCache: Map<string, CacheEntry<any>> = new Map()
  private commandCache: Map<string, CacheEntry<any>> = new Map()
  
  // Cache statistics
  private stats = {
    promptHits: 0,
    promptMisses: 0,
    responseHits: 0,
    responseMisses: 0,
    commandHits: 0,
    commandMisses: 0,
    totalSaved: 0 // Estimated $ saved
  }

  /**
   * Generate cache key from input
   */
  private generateKey(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex')
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  /**
   * Clean expired entries
   */
  private cleanup(cache: Map<string, CacheEntry<any>>): void {
    const now = Date.now()
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        cache.delete(key)
      }
    }
  }

  /**
   * Cache prompt and get cache key for Anthropic
   * This enables Anthropic's prompt caching feature
   */
  cachePrompt(prompt: string, ttl: number = 300000): { key: string; cached: boolean } {
    const key = this.generateKey(prompt)
    const existing = this.promptCache.get(key)

    if (existing && this.isValid(existing)) {
      existing.hits++
      this.stats.promptHits++
      return { key, cached: true }
    }

    this.promptCache.set(key, {
      data: prompt,
      timestamp: Date.now(),
      ttl,
      hits: 0
    })

    this.stats.promptMisses++
    this.cleanup(this.promptCache)
    return { key, cached: false }
  }

  /**
   * Cache AI response
   */
  cacheResponse(query: string, response: any, ttl: number = 3600000): void {
    const key = this.generateKey(query)
    this.responseCache.set(key, {
      data: response,
      timestamp: Date.now(),
      ttl,
      hits: 0
    })
    this.cleanup(this.responseCache)
  }

  /**
   * Get cached response
   */
  getCachedResponse(query: string): any | null {
    const key = this.generateKey(query)
    const entry = this.responseCache.get(key)

    if (entry && this.isValid(entry)) {
      entry.hits++
      this.stats.responseHits++
      
      // Estimate cost savings ($0.003 per 1K tokens, avg response ~1K tokens)
      this.stats.totalSaved += 0.003
      
      return entry.data
    }

    this.stats.responseMisses++
    return null
  }

  /**
   * Cache command result
   */
  cacheCommand(command: string, result: any, ttl: number = 60000): void {
    // Only cache read-only commands
    if (!this.isReadOnlyCommand(command)) {
      return
    }

    const key = this.generateKey(command)
    this.commandCache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl,
      hits: 0
    })
    this.cleanup(this.commandCache)
  }

  /**
   * Get cached command result
   */
  getCachedCommand(command: string): any | null {
    const key = this.generateKey(command)
    const entry = this.commandCache.get(key)

    if (entry && this.isValid(entry)) {
      entry.hits++
      this.stats.commandHits++
      return entry.data
    }

    this.stats.commandMisses++
    return null
  }

  /**
   * Check if command is read-only (safe to cache)
   */
  private isReadOnlyCommand(command: string): boolean {
    const cmd = command.trim().toLowerCase()
    const readOnlyCommands = [
      'ls', 'cat', 'pwd', 'echo', 'grep', 'find',
      'ps', 'top', 'df', 'du', 'free', 'uptime',
      'git status', 'git log', 'git diff',
      'npm list', 'pip list', 'which', 'whereis',
      'head', 'tail', 'less', 'more', 'wc'
    ]

    return readOnlyCommands.some(ro => cmd.startsWith(ro))
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalPromptRequests = this.stats.promptHits + this.stats.promptMisses
    const totalResponseRequests = this.stats.responseHits + this.stats.responseMisses
    const totalCommandRequests = this.stats.commandHits + this.stats.commandMisses

    return {
      prompts: {
        hits: this.stats.promptHits,
        misses: this.stats.promptMisses,
        hitRate: totalPromptRequests > 0 ? (this.stats.promptHits / totalPromptRequests * 100).toFixed(1) + '%' : '0%',
        cacheSize: this.promptCache.size
      },
      responses: {
        hits: this.stats.responseHits,
        misses: this.stats.responseMisses,
        hitRate: totalResponseRequests > 0 ? (this.stats.responseHits / totalResponseRequests * 100).toFixed(1) + '%' : '0%',
        cacheSize: this.responseCache.size
      },
      commands: {
        hits: this.stats.commandHits,
        misses: this.stats.commandMisses,
        hitRate: totalCommandRequests > 0 ? (this.stats.commandHits / totalCommandRequests * 100).toFixed(1) + '%' : '0%',
        cacheSize: this.commandCache.size
      },
      totalSaved: `$${this.stats.totalSaved.toFixed(2)}`
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.promptCache.clear()
    this.responseCache.clear()
    this.commandCache.clear()
    this.stats = {
      promptHits: 0,
      promptMisses: 0,
      responseHits: 0,
      responseMisses: 0,
      commandHits: 0,
      commandMisses: 0,
      totalSaved: 0
    }
  }

  /**
   * Clear specific cache
   */
  clearPromptCache(): void {
    this.promptCache.clear()
  }

  clearResponseCache(): void {
    this.responseCache.clear()
  }

  clearCommandCache(): void {
    this.commandCache.clear()
  }

  /**
   * Get cache sizes
   */
  getSizes() {
    return {
      prompts: this.promptCache.size,
      responses: this.responseCache.size,
      commands: this.commandCache.size,
      total: this.promptCache.size + this.responseCache.size + this.commandCache.size
    }
  }
}

// Global cache instance
let globalCache: AgentCache | null = null

export function getGlobalCache(): AgentCache {
  if (!globalCache) {
    globalCache = new AgentCache()
  }
  return globalCache
}
