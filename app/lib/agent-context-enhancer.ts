/**
 * Agent Context Enhancer
 * Automatically enhances agent context with documentation and real-time data
 * Integrates MCP servers seamlessly with agent workflow
 */

import { logger } from './utils/logger'
import { agentDocumentationHelper } from './agent-documentation-helper'
import { autoDocumentationFetcher } from './auto-documentation-fetcher'

export interface EnhancedContext {
  documentation?: string
  webData?: string
  systemInfo?: string
  totalTokens: number
  sources: string[]
}

export class AgentContextEnhancer {
  private static instance: AgentContextEnhancer
  
  private constructor() {}
  
  static getInstance(): AgentContextEnhancer {
    if (!this.instance) {
      this.instance = new AgentContextEnhancer()
    }
    return this.instance
  }
  
  /**
   * Main method: Enhance agent context for any task
   */
  async enhanceContextForTask(
    taskDescription: string,
    mcpEnabled: boolean = true
  ): Promise<EnhancedContext> {
    const context: EnhancedContext = {
      totalTokens: 0,
      sources: []
    }
    
    if (!mcpEnabled) {
      logger.debug('MCP disabled, skipping context enhancement')
      return context
    }
    
    logger.info(`🔍 Enhancing context for: ${taskDescription.substring(0, 100)}...`)
    
    // Step 1: Fetch relevant documentation
    try {
      const docs = await this.fetchRelevantDocumentation(taskDescription)
      if (docs) {
        context.documentation = docs
        context.totalTokens += docs.length / 4 // Rough token estimate
        context.sources.push('Context7 Documentation')
        logger.info(`✅ Added documentation (${docs.length} chars)`)
      }
    } catch (error) {
      logger.error('Failed to fetch documentation:', error)
    }
    
    // Step 2: For benchmarking tasks, fetch technical specs
    if (this.isBenchmarkingTask(taskDescription)) {
      try {
        const specs = await this.fetchBenchmarkingSpecs(taskDescription)
        if (specs) {
          context.systemInfo = specs
          context.totalTokens += specs.length / 4
          context.sources.push('Benchmarking Specifications')
          logger.info('✅ Added benchmarking specs')
        }
      } catch (error) {
        logger.error('Failed to fetch benchmarking specs:', error)
      }
    }
    
    // Step 3: For migration/database tasks, fetch schema info
    if (this.isDatabaseTask(taskDescription)) {
      logger.info('📊 Database task detected - additional context recommended')
      context.sources.push('Database Task Detected')
    }
    
    logger.info(`📈 Context enhanced: ${context.sources.join(', ')} (${context.totalTokens} tokens)`)
    
    return context
  }
  
  /**
   * Enhance context for long-running tasks specifically
   */
  async enhanceForLongRunningTask(
    taskDescription: string,
    taskType: string,
    mcpEnabled: boolean = true
  ): Promise<string> {
    if (!mcpEnabled) {
      return ''
    }
    
    logger.info(`📚 Fetching documentation for ${taskType} task...`)
    
    let enhancedPrompt = ''
    
    // Get task-specific documentation
    const docs = await agentDocumentationHelper.fetchDocumentationForTask(taskDescription)
    
    if (docs) {
      enhancedPrompt = `
<available_documentation>
The following documentation has been automatically fetched for your task.
Use this to ensure correct command syntax and best practices.

${docs}
</available_documentation>

`
    }
    
    // Add task-type specific guidance
    if (taskType === 'MULTI_DAY' || taskType === 'LONG_RUNNING') {
      enhancedPrompt += `
<long_running_task_guidance>
This is a long-running task that may take hours or days.

**Best Practices:**
1. Use screen/tmux for background execution
2. Redirect output to log files
3. Track PID for monitoring
4. Create checkpoints every hour
5. Log progress indicators
6. Handle errors gracefully (don't abort entire task)

**Example Pattern:**
\`\`\`bash
# Start in detached screen
screen -dmS task_name bash -c '
  echo "Started: $(date)" > task.log
  your_long_command 2>&1 | tee -a task.log
  echo "Completed: $(date)" >> task.log
'

# Monitor progress
tail -f task.log

# Check if still running
screen -list | grep task_name
\`\`\`
</long_running_task_guidance>
`
    }
    
    return enhancedPrompt
  }
  
  /**
   * Enhance context during task execution
   * Called when agent needs help with specific step
   */
  async enhanceDuringExecution(
    currentStep: string,
    errorMessage?: string
  ): Promise<string> {
    logger.info(`🔧 Enhancing context for step: ${currentStep}`)
    
    let enhancement = ''
    
    // If there's an error, fetch troubleshooting docs
    if (errorMessage) {
      const troubleshooting = await this.fetchTroubleshootingDocs(errorMessage)
      if (troubleshooting) {
        enhancement += `
<troubleshooting_docs>
${troubleshooting}
</troubleshooting_docs>
`
      }
    }
    
    // Fetch docs for the current step
    const stepDocs = await agentDocumentationHelper.getCommandHelp(currentStep)
    if (stepDocs) {
      enhancement += `
<step_documentation>
${stepDocs}
</step_documentation>
`
    }
    
    return enhancement
  }
  
  /**
   * Helper methods
   */
  
  private async fetchRelevantDocumentation(taskDescription: string): Promise<string> {
    return await agentDocumentationHelper.fetchDocumentationForTask(taskDescription)
  }
  
  private async fetchBenchmarkingSpecs(taskDescription: string): Promise<string> {
    // Detect benchmark type
    const isMLPerf = /mlperf/i.test(taskDescription)
    const isSysbench = /sysbench/i.test(taskDescription)
    
    if (isMLPerf) {
      return `
## MLPerf Benchmarking Specifications

**Official MLPerf Models:**
- ResNet-50 (Image Classification)
- BERT (NLP)
- GPT-2/GPT-3 (Language Models)
- YOLO (Object Detection)
- MobileNet (Mobile Vision)
- EfficientNet (Efficient Vision)

**Typical Benchmark Flow:**
1. **Setup**: Install MLPerf toolkit, download datasets
2. **Per Model**: Download weights → Warmup → Benchmark → Collect results
3. **Aggregate**: Compile results, generate report

**Key Metrics:**
- Throughput (samples/sec or tokens/sec)
- Latency (milliseconds per inference)
- Accuracy (% correct)
- GPU Utilization (%)
- Power Consumption (watts)

**Time Estimates:**
- Small models (MobileNet): 2-4 hours
- Medium models (ResNet-50): 6-8 hours
- Large models (BERT, GPT-2): 8-12 hours
- Total for 6 models: 3-5 days

**Important Notes:**
- Always use GPU for meaningful results
- Run in screen/tmux for multi-hour tasks
- Monitor GPU with: \`watch -n 5 nvidia-smi\`
- Check progress: \`tail -f benchmark.log\`
`
    }
    
    if (isSysbench) {
      return `
## Sysbench Specifications

**Benchmark Types:**
- CPU: \`sysbench cpu run\`
- Memory: \`sysbench memory run\`
- File I/O: \`sysbench fileio prepare && sysbench fileio run\`
- Database: \`sysbench oltp_read_write prepare && run\`

**Duration:** Usually 10 minutes to 2 hours per test
`
    }
    
    return ''
  }
  
  private async fetchTroubleshootingDocs(errorMessage: string): Promise<string> {
    // Extract error type
    const errorLower = errorMessage.toLowerCase()
    
    if (errorLower.includes('cuda') || errorLower.includes('gpu')) {
      return `
**GPU/CUDA Troubleshooting:**
- Check GPU: \`nvidia-smi\`
- Clear GPU memory: Restart Python/PyTorch process
- Set specific GPU: \`export CUDA_VISIBLE_DEVICES=0\`
- Reduce batch size if OOM
`
    }
    
    if (errorLower.includes('permission') || errorLower.includes('denied')) {
      return `
**Permission Error Troubleshooting:**
- Try with sudo: \`sudo <command>\`
- Check file permissions: \`ls -la\`
- Check current user: \`whoami\`
- Add user to group: \`sudo usermod -aG group user\`
`
    }
    
    if (errorLower.includes('not found') || errorLower.includes('command not found')) {
      return `
**Command Not Found Troubleshooting:**
- Install package first
- Check if in PATH: \`which <command>\`
- Find package: \`apt search <name>\` or \`yum search <name>\`
`
    }
    
    return ''
  }
  
  private isBenchmarkingTask(task: string): boolean {
    return /benchmark|mlperf|sysbench|stress[\s-]ng|performance test/i.test(task)
  }
  
  private isDatabaseTask(task: string): boolean {
    return /database|migration|postgres|mysql|mongodb|prisma/i.test(task)
  }
  
  /**
   * Format enhanced context for agent prompt
   */
  formatEnhancedContext(context: EnhancedContext): string {
    if (context.sources.length === 0) {
      return ''
    }
    
    let formatted = '\n\n<enhanced_context>\n'
    formatted += `Auto-fetched from: ${context.sources.join(', ')}\n\n`
    
    if (context.documentation) {
      formatted += context.documentation + '\n\n'
    }
    
    if (context.systemInfo) {
      formatted += context.systemInfo + '\n\n'
    }
    
    if (context.webData) {
      formatted += context.webData + '\n\n'
    }
    
    formatted += '</enhanced_context>\n'
    
    return formatted
  }
}

export const agentContextEnhancer = AgentContextEnhancer.getInstance()

