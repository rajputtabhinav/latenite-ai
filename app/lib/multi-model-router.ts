// Server-side only - removed 'use client'

export interface TaskAnalysis {
  complexity: 'simple' | 'medium' | 'complex'
  requiresCoding: boolean
  requiresReasoning: boolean
  estimatedTokens: number
  confidence: number
}

export interface ModelSpec {
  id: string
  name: string
  provider: string
  costPerMillion: number // Input tokens
  speed: 'fast' | 'medium' | 'slow'
  capability: 'basic' | 'intermediate' | 'advanced'
  contextWindow: number
}

export class MultiModelRouter {
  private models: Map<string, ModelSpec> = new Map()

  constructor() {
    this.initializeModels()
  }

  /**
   * Initialize available models
   */
  private initializeModels(): void {
    // Fast models for simple tasks
    this.models.set('claude-3-haiku', {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      costPerMillion: 0.25,
      speed: 'fast',
      capability: 'basic',
      contextWindow: 200000
    })

    // Balanced models for most tasks (DEFAULT - ALWAYS USE THIS)
    this.models.set('claude-sonnet-4-5', {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      costPerMillion: 3.00,
      speed: 'medium',
      capability: 'advanced',
      contextWindow: 1000000
    })

    // Powerful models for complex tasks
    this.models.set('claude-opus-4', {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      provider: 'anthropic',
      costPerMillion: 15.00,
      speed: 'slow',
      capability: 'advanced',
      contextWindow: 200000
    })
  }

  /**
   * Analyze task to determine complexity
   */
  analyzeTask(task: string, context?: string): TaskAnalysis {
    const lowerTask = task.toLowerCase()
    
    // Check for coding indicators
    const codingKeywords = [
      'write', 'create', 'implement', 'function', 'class', 'code',
      'refactor', 'debug', 'fix', 'algorithm', 'api', 'component'
    ]
    const requiresCoding = codingKeywords.some(keyword => lowerTask.includes(keyword))

    // Check for reasoning indicators
    const reasoningKeywords = [
      'why', 'how', 'explain', 'analyze', 'compare', 'evaluate',
      'design', 'architecture', 'optimize', 'strategy', 'plan'
    ]
    const requiresReasoning = reasoningKeywords.some(keyword => lowerTask.includes(keyword))

    // Check for simple task indicators
    const simpleKeywords = [
      'list', 'show', 'display', 'get', 'check', 'status',
      'ls', 'pwd', 'cat', 'echo', 'ps', 'df', 'uptime'
    ]
    const isSimple = simpleKeywords.some(keyword => lowerTask.includes(keyword))

    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil((task.length + (context?.length || 0)) / 4)

    // Determine complexity
    let complexity: 'simple' | 'medium' | 'complex' = 'medium'
    let confidence = 0.7

    if (isSimple && !requiresCoding && !requiresReasoning) {
      complexity = 'simple'
      confidence = 0.9
    } else if (requiresCoding || requiresReasoning || task.length > 500) {
      complexity = 'complex'
      confidence = 0.8
    } else if (task.split('\n').length > 5 || task.includes('multiple')) {
      complexity = 'complex'
      confidence = 0.75
    }

    return {
      complexity,
      requiresCoding,
      requiresReasoning,
      estimatedTokens,
      confidence
    }
  }

  /**
   * Select optimal model based on task analysis
   */
  selectModel(task: string, context?: string): { model: ModelSpec; analysis: TaskAnalysis } {
    const analysis = this.analyzeTask(task, context)
    let selectedModel: ModelSpec

    // ALWAYS USE SONNET 4.5 - It's the best balanced model
    // Disable auto-routing to Opus to avoid token limit issues
    selectedModel = this.models.get('claude-sonnet-4-5')!
    console.log(`⚡ Using Sonnet 4.5 (1M context, 64K output tokens)`)

    return { model: selectedModel, analysis }
  }

  /**
   * Get cost estimate for task
   */
  estimateCost(task: string, context?: string): {
    model: string
    estimatedCost: number
    estimatedTokens: number
  } {
    const { model, analysis } = this.selectModel(task, context)
    const estimatedCost = (analysis.estimatedTokens / 1000000) * model.costPerMillion
    
    return {
      model: model.name,
      estimatedCost: parseFloat(estimatedCost.toFixed(4)),
      estimatedTokens: analysis.estimatedTokens
    }
  }

  /**
   * Compare costs across models
   */
  compareCosts(task: string, context?: string): Array<{
    model: string
    cost: number
    speed: string
    recommended: boolean
  }> {
    const analysis = this.analyzeTask(task, context)
    const { model: recommended } = this.selectModel(task, context)
    
    const comparison: Array<{
      model: string
      cost: number
      speed: string
      recommended: boolean
    }> = []

    for (const [key, model] of this.models) {
      const cost = (analysis.estimatedTokens / 1000000) * model.costPerMillion
      comparison.push({
        model: model.name,
        cost: parseFloat(cost.toFixed(4)),
        speed: model.speed,
        recommended: model.id === recommended.id
      })
    }

    return comparison.sort((a, b) => a.cost - b.cost)
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): ModelSpec | undefined {
    return this.models.get(modelId)
  }

  /**
   * Get all models
   */
  getAllModels(): ModelSpec[] {
    return Array.from(this.models.values())
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      totalModels: this.models.size,
      models: this.getAllModels().map(m => ({
        name: m.name,
        speed: m.speed,
        capability: m.capability,
        cost: `$${m.costPerMillion}/M tokens`
      }))
    }
  }

  /**
   * Force specific model for task
   */
  forceModel(modelId: string): ModelSpec | null {
    const model = this.models.get(modelId)
    if (model) {
      console.log(`🎯 Force using: ${model.name}`)
      return model
    }
    return null
  }
}

// Global router instance
let globalRouter: MultiModelRouter | null = null

export function getGlobalRouter(): MultiModelRouter {
  if (!globalRouter) {
    globalRouter = new MultiModelRouter()
  }
  return globalRouter
}
