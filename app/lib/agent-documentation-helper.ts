/**
 * Agent Documentation Helper
 * Automatically fetches documentation when agent needs help with tasks
 * Integrates Context7 MCP with long-running task system
 */

import { logger } from './utils/logger'

export interface DocumentationRequest {
  library: string
  topic?: string
  context?: string
  urgency?: 'low' | 'medium' | 'high'
}

export interface DocumentationResult {
  library: string
  content: string
  relevance: number
  source: 'context7' | 'fallback' | 'cached'
  timestamp: number
}

class AgentDocumentationHelper {
  private static instance: AgentDocumentationHelper
  private docCache: Map<string, DocumentationResult> = new Map()
  private cacheExpiry: number = 3600000 // 1 hour
  
  private constructor() {
    this.loadCache()
  }
  
  static getInstance(): AgentDocumentationHelper {
    if (!this.instance) {
      this.instance = new AgentDocumentationHelper()
    }
    return this.instance
  }
  
  /**
   * Smart documentation fetcher - automatically detects what docs are needed
   */
  async fetchDocumentationForTask(taskDescription: string): Promise<string> {
    logger.info(`📚 Fetching documentation for task: ${taskDescription}`)
    
    // Detect libraries/tools mentioned in task
    const detectedLibraries = this.detectLibraries(taskDescription)
    
    if (detectedLibraries.length === 0) {
      logger.debug('No specific libraries detected in task')
      return ''
    }
    
    let combinedDocs = ''
    
    for (const library of detectedLibraries) {
      try {
        const docs = await this.fetchLibraryDocs(library, taskDescription)
        if (docs) {
          combinedDocs += `\n\n## ${library} Documentation\n\n${docs.content}\n`
        }
      } catch (error) {
        logger.error(`Failed to fetch docs for ${library}:`, error)
      }
    }
    
    return combinedDocs
  }
  
  /**
   * Fetch documentation for a specific library
   */
  async fetchLibraryDocs(
    library: string,
    context?: string
  ): Promise<DocumentationResult | null> {
    // Check cache first
    const cacheKey = `${library}:${context || 'general'}`
    const cached = this.docCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      logger.debug(`📦 Using cached docs for ${library}`)
      return cached
    }
    
    try {
      // Try Context7 MCP first
      const context7Result = await this.fetchFromContext7(library, context)
      if (context7Result) {
        this.docCache.set(cacheKey, context7Result)
        this.persistCache()
        return context7Result
      }
    } catch (error) {
      logger.warn(`Context7 failed for ${library}, trying fallback`)
    }
    
    // Fallback to built-in knowledge
    const fallbackResult = await this.getFallbackDocs(library, context)
    if (fallbackResult) {
      this.docCache.set(cacheKey, fallbackResult)
      return fallbackResult
    }
    
    return null
  }
  
  /**
   * Detect libraries/tools mentioned in task description
   */
  private detectLibraries(taskDescription: string): string[] {
    const text = taskDescription.toLowerCase()
    const detected: string[] = []
    
    // ML/AI Libraries
    const mlLibraries = [
      { pattern: /mlperf|ml[\s-]?perf/i, name: 'mlperf' },
      { pattern: /pytorch|torch/i, name: 'pytorch' },
      { pattern: /tensorflow|tf/i, name: 'tensorflow' },
      { pattern: /transformers|hugging[\s-]?face/i, name: 'transformers' },
      { pattern: /resnet/i, name: 'resnet' },
      { pattern: /bert/i, name: 'bert' },
      { pattern: /gpt[-\s]?2|gpt[-\s]?3/i, name: 'gpt' },
      { pattern: /yolo/i, name: 'yolo' },
      { pattern: /mobilenet/i, name: 'mobilenet' },
      { pattern: /efficientnet/i, name: 'efficientnet' },
      { pattern: /nvidia|cuda/i, name: 'cuda' },
      { pattern: /scikit[\s-]?learn|sklearn/i, name: 'scikit-learn' },
    ]
    
    // Database Libraries
    const dbLibraries = [
      { pattern: /postgresql|postgres|psql/i, name: 'postgresql' },
      { pattern: /mysql/i, name: 'mysql' },
      { pattern: /mongodb/i, name: 'mongodb' },
      { pattern: /redis/i, name: 'redis' },
      { pattern: /prisma/i, name: 'prisma' },
      { pattern: /sequelize/i, name: 'sequelize' },
      { pattern: /typeorm/i, name: 'typeorm' },
    ]
    
    // Web Frameworks
    const webLibraries = [
      { pattern: /next\.?js|nextjs/i, name: 'next.js' },
      { pattern: /react(?!\s*native)/i, name: 'react' },
      { pattern: /vue\.?js|vuejs/i, name: 'vue.js' },
      { pattern: /angular/i, name: 'angular' },
      { pattern: /express\.?js|expressjs/i, name: 'express' },
      { pattern: /fastify/i, name: 'fastify' },
    ]
    
    // DevOps/System Tools
    const devOpsLibraries = [
      { pattern: /docker/i, name: 'docker' },
      { pattern: /kubernetes|k8s/i, name: 'kubernetes' },
      { pattern: /nginx/i, name: 'nginx' },
      { pattern: /apache/i, name: 'apache' },
      { pattern: /terraform/i, name: 'terraform' },
      { pattern: /ansible/i, name: 'ansible' },
    ]
    
    const allLibraries = [
      ...mlLibraries,
      ...dbLibraries,
      ...webLibraries,
      ...devOpsLibraries
    ]
    
    for (const lib of allLibraries) {
      if (lib.pattern.test(text)) {
        detected.push(lib.name)
      }
    }
    
    return [...new Set(detected)] // Remove duplicates
  }
  
  /**
   * Fetch documentation from Context7 MCP
   */
  private async fetchFromContext7(
    library: string,
    context?: string
  ): Promise<DocumentationResult | null> {
    try {
      logger.debug(`🔍 Fetching ${library} docs from Context7...`)
      
      // Step 1: Resolve library ID
      const resolveResponse = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: 'context7',
          tool: 'resolve-library-id',
          parameters: {
            libraryName: library
          }
        })
      })
      
      if (!resolveResponse.ok) {
        throw new Error(`Context7 resolve failed: ${resolveResponse.status}`)
      }
      
      const resolveData = await resolveResponse.json()
      
      // FIX: Context7 returns libraryId directly, not libraries array
      if (!resolveData.success || !resolveData.result?.libraryId) {
        logger.warn(`No library found for: ${library}`)
        return null
      }
      
      const libraryId = resolveData.result.libraryId
      logger.debug(`✅ Resolved ${library} to ${libraryId}`)
      
      // Step 2: Fetch documentation
      const docsResponse = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: 'context7',
          tool: 'query-docs',  // FIX: Use correct tool name
          parameters: {
            context7CompatibleLibraryID: libraryId,
            topic: context || library,
            tokens: 3000 // Get 3000 tokens of docs
          }
        })
      })
      
      if (!docsResponse.ok) {
        throw new Error(`Context7 docs fetch failed: ${docsResponse.status}`)
      }
      
      const docsData = await docsResponse.json()
      
      if (!docsData.success || !docsData.result?.documentation) {
        return null
      }
      
      const result: DocumentationResult = {
        library,
        content: docsData.result.documentation,
        relevance: 0.9,
        source: 'context7',
        timestamp: Date.now()
      }
      
      logger.info(`✅ Fetched ${library} documentation from Context7`)
      return result
      
    } catch (error) {
      logger.error(`Context7 error for ${library}:`, error)
      return null
    }
  }
  
  /**
   * Fallback documentation for common tools
   */
  private async getFallbackDocs(
    library: string,
    context?: string
  ): Promise<DocumentationResult | null> {
    const fallbackDocs: Record<string, string> = {
      'mlperf': `
# MLPerf Benchmarking Guide

## Installation
\`\`\`bash
pip install mlperf-loadgen mlperf-logging
pip install torch torchvision transformers
\`\`\`

## Basic Benchmark Setup
\`\`\`python
import mlperf_loadgen as lg
from transformers import AutoModel, AutoTokenizer

# Load model
model = AutoModel.from_pretrained('model_name')
tokenizer = AutoTokenizer.from_pretrained('model_name')

# Run benchmark
lg.StartTest(settings, query_samples, ...)
\`\`\`

## Common Commands
- Download model: \`transformers-cli download model_name\`
- Run inference: \`python run_mlperf.py --model <name> --dataset <path>\`
- View results: \`cat results/mlperf_summary.txt\`
`,
      
      'pytorch': `
# PyTorch Quick Reference

## Installation
\`\`\`bash
pip install torch torchvision torchaudio
\`\`\`

## GPU Check
\`\`\`python
import torch
print(torch.cuda.is_available())
print(torch.cuda.device_count())
\`\`\`

## Load Pre-trained Model
\`\`\`python
import torch
model = torch.hub.load('pytorch/vision:v0.10.0', 'resnet50', pretrained=True)
model.eval()
\`\`\`
`,
      
      'transformers': `
# HuggingFace Transformers

## Installation
\`\`\`bash
pip install transformers torch
\`\`\`

## Download Model
\`\`\`python
from transformers import AutoModel, AutoTokenizer

model = AutoModel.from_pretrained('bert-base-uncased')
tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
\`\`\`

## Common Models
- BERT: \`bert-base-uncased\`, \`bert-large-uncased\`
- GPT-2: \`gpt2\`, \`gpt2-medium\`, \`gpt2-large\`
- ResNet: \`microsoft/resnet-50\`
`,
      
      'cuda': `
# NVIDIA CUDA

## Check CUDA Version
\`\`\`bash
nvidia-smi
nvcc --version
\`\`\`

## Common CUDA Commands
- Monitor GPU: \`watch -n 1 nvidia-smi\`
- Set GPU: \`export CUDA_VISIBLE_DEVICES=0\`
- Clear GPU memory: Restart Python process
`,
      
      'docker': `
# Docker Quick Reference

## Basic Commands
- Build image: \`docker build -t name .\`
- Run container: \`docker run -it name\`
- List containers: \`docker ps -a\`
- Stop container: \`docker stop <id>\`
- Remove container: \`docker rm <id>\`

## GPU Support
\`\`\`bash
docker run --gpus all -it image_name
\`\`\`
`,
      
      'screen': `
# GNU Screen

## Basic Usage
- Start session: \`screen -S session_name\`
- Detach: Press \`Ctrl+A\` then \`D\`
- List sessions: \`screen -list\`
- Reattach: \`screen -r session_name\`
- Kill session: \`screen -X -S session_name quit\`

## Monitor Background Task
\`\`\`bash
screen -dmS task_name bash -c 'your_command'
screen -r task_name  # Reattach to view
\`\`\`
`
    }
    
    const content = fallbackDocs[library.toLowerCase()]
    
    if (content) {
      logger.info(`📖 Using fallback docs for ${library}`)
      return {
        library,
        content,
        relevance: 0.7,
        source: 'fallback',
        timestamp: Date.now()
      }
    }
    
    return null
  }
  
  /**
   * Get documentation for specific command
   */
  async getCommandHelp(command: string): Promise<string> {
    const commandParts = command.trim().split(/\s+/)
    const baseCommand = commandParts[0]
    
    // Map commands to libraries
    const commandLibraryMap: Record<string, string> = {
      'docker': 'docker',
      'kubectl': 'kubernetes',
      'npm': 'npm',
      'pip': 'pip',
      'git': 'git',
      'python': 'python',
      'node': 'node.js',
      'nvidia-smi': 'cuda',
      'screen': 'screen',
      'tmux': 'tmux'
    }
    
    const library = commandLibraryMap[baseCommand]
    if (library) {
      const docs = await this.fetchLibraryDocs(library, command)
      return docs?.content || ''
    }
    
    return ''
  }
  
  /**
   * Cache management
   */
  private loadCache(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('agent_docs_cache')
        if (stored) {
          const parsed = JSON.parse(stored)
          Object.entries(parsed).forEach(([key, value]) => {
            this.docCache.set(key, value as DocumentationResult)
          })
          logger.debug(`Loaded ${this.docCache.size} cached docs`)
        }
      }
    } catch (error) {
      logger.error('Failed to load doc cache:', error)
    }
  }
  
  private persistCache(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const cacheObj = Object.fromEntries(this.docCache.entries())
        localStorage.setItem('agent_docs_cache', JSON.stringify(cacheObj))
      }
    } catch (error) {
      logger.error('Failed to persist doc cache:', error)
    }
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.docCache.clear()
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('agent_docs_cache')
    }
    logger.info('Documentation cache cleared')
  }
}

export const agentDocumentationHelper = AgentDocumentationHelper.getInstance()

