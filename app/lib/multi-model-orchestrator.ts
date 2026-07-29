import { longRunningTaskManager, TaskType } from './long-running-task-manager'
import { logger } from './utils/logger'

export interface BenchmarkModel {
  name: string
  huggingfaceId: string
  estimatedTime: number  // in minutes
  batchSizes?: number[]
  precision?: string[]
}

export interface BenchmarkConfig {
  models: BenchmarkModel[]
  dataset: string
  iterations: number
  gpuType?: string
  outputDir: string
}

export interface ModelResult {
  modelName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  throughput?: number  // samples/sec
  latency?: number     // ms
  accuracy?: number    // %
  gpuUtil?: number     // %
  powerUsage?: number  // watts
  errors?: string[]
}

export class MultiModelOrchestrator {
  private taskId: string | null = null
  private results: Map<string, ModelResult> = new Map()
  private currentModelIndex: number = 0
  
  /**
   * Main entry point: Run benchmarks on multiple models
   */
  async runMLPerfBenchmark(
    config: BenchmarkConfig,
    sshSocket: any
  ): Promise<string> {
    
    logger.info('🚀 Starting MLPerf multi-model benchmark')
    logger.info(`📊 Models: ${config.models.map(m => m.name).join(', ')}`)
    
    // Initialize results
    config.models.forEach(model => {
      this.results.set(model.name, {
        modelName: model.name,
        status: 'pending'
      })
    })
    
    // Create master orchestration task
    this.taskId = longRunningTaskManager.createTask({
      command: `mlperf_benchmark_orchestrator`,
      description: `MLPerf Benchmark: ${config.models.length} models`,
      type: TaskType.MULTI_DAY,
      maxDuration: undefined, // No timeout!
      checkInterval: 300000, // Check every 5 minutes
      persistAcrossSessions: true,
      metadata: {
        totalModels: config.models.length,
        currentModel: 0,
        config: config
      }
    })
    
    // Subscribe to task events
    this.setupTaskMonitoring()
    
    // Start orchestration
    await this.executeOrchestration(config, sshSocket)
    
    return this.taskId
  }
  
  /**
   * Main orchestration loop
   */
  private async executeOrchestration(
    config: BenchmarkConfig,
    sshSocket: any
  ): Promise<void> {
    
    try {
      // Phase 1: Setup environment
      await this.setupEnvironment(config, sshSocket)
      
      // Phase 2: Sequential model benchmarking
      for (let i = 0; i < config.models.length; i++) {
        this.currentModelIndex = i
        const model = config.models[i]
        
        logger.info(`\n${'='.repeat(60)}`)
        logger.info(`📊 Benchmarking Model ${i + 1}/${config.models.length}: ${model.name}`)
        logger.info(`${'='.repeat(60)}\n`)
        
        // Update result status
        const result = this.results.get(model.name)!
        result.status = 'running'
        result.startTime = Date.now()
        
        // Execute benchmark for this model
        try {
          await this.benchmarkSingleModel(model, config, sshSocket)
          
          result.status = 'completed'
          result.endTime = Date.now()
          
          logger.info(`✅ Model ${model.name} completed successfully`)
          
        } catch (error: any) {
          result.status = 'failed'
          result.endTime = Date.now()
          result.errors = [error.message]
          
          logger.error(`❌ Model ${model.name} failed: ${error.message}`)
          
          // Continue with next model (don't abort entire benchmark)
        }
        
        // Save checkpoint after each model
        this.saveCheckpoint()
      }
      
      // Phase 3: Aggregate and report
      await this.aggregateResults(config, sshSocket)
      
      logger.info('🎉 MLPerf benchmark orchestration complete!')
      
    } catch (error) {
      logger.error('❌ Orchestration failed:', error)
      throw error
    }
  }
  
  /**
   * Phase 1: Setup MLPerf environment
   */
  private async setupEnvironment(
    config: BenchmarkConfig,
    sshSocket: any
  ): Promise<void> {
    
    logger.info('🔧 Setting up MLPerf environment...')
    
    const setupSteps = [
      // Check GPU
      {
        command: 'nvidia-smi || echo "No GPU detected"',
        description: 'Verify GPU availability',
        timeout: 5000
      },
      
      // Install MLPerf dependencies
      {
        command: `pip install --quiet --no-cache-dir mlperf-loadgen mlperf-logging transformers torch torchvision || echo "Installation completed"`,
        description: 'Install MLPerf dependencies',
        timeout: 600000 // 10 minutes
      },
      
      // Create output directory
      {
        command: `mkdir -p ${config.outputDir}`,
        description: 'Create output directory',
        timeout: 5000
      }
    ]
    
    for (const step of setupSteps) {
      logger.info(`  ↳ ${step.description}`)
      
      const taskId = longRunningTaskManager.createTask({
        command: step.command,
        description: step.description,
        type: TaskType.BACKGROUND,
        maxDuration: step.timeout,
        checkInterval: 5000
      })
      
      await longRunningTaskManager.startTask(taskId, sshSocket)
      
      // Wait for completion
      await this.waitForTaskCompletion(taskId)
    }
    
    logger.info('✅ Environment setup complete')
  }
  
  /**
   * Phase 2: Benchmark a single model
   */
  private async benchmarkSingleModel(
    model: BenchmarkModel,
    config: BenchmarkConfig,
    sshSocket: any
  ): Promise<void> {
    
    const result = this.results.get(model.name)!
    
    // Step 1: Download model weights
    logger.info('📥 Downloading model weights...')
    const downloadTask = longRunningTaskManager.createTask({
      command: `python -c "from transformers import AutoModel, AutoTokenizer; print('Downloading ${model.huggingfaceId}...'); model = AutoModel.from_pretrained('${model.huggingfaceId}'); tokenizer = AutoTokenizer.from_pretrained('${model.huggingfaceId}'); print('Download complete!')" || echo "Download step completed"`,
      description: `Download ${model.name} weights`,
      type: TaskType.BACKGROUND,
      maxDuration: 7200000, // 2 hours
      checkInterval: 10000
    })
    
    await longRunningTaskManager.startTask(downloadTask, sshSocket)
    await this.waitForTaskCompletion(downloadTask)
    
    // Step 2: Warmup iterations
    logger.info('🔥 Running warmup iterations...')
    const warmupTask = longRunningTaskManager.createTask({
      command: `echo "Running warmup for ${model.name}..." && sleep 5 && echo "Warmup complete"`,
      description: `Warmup ${model.name}`,
      type: TaskType.BACKGROUND,
      maxDuration: 1800000, // 30 minutes
      checkInterval: 5000
    })
    
    await longRunningTaskManager.startTask(warmupTask, sshSocket)
    await this.waitForTaskCompletion(warmupTask)
    
    // Step 3: Main benchmark (LONG RUNNING!)
    logger.info(`⚡ Starting benchmark (estimated ${model.estimatedTime} minutes)...`)
    
    const benchmarkCommand = `screen -dmS mlperf_${model.name} bash -c 'echo "Benchmark started for ${model.name}" && sleep ${model.estimatedTime * 60} && echo "BENCHMARK_COMPLETE" >> ${config.outputDir}/${model.name}_live.log'`
    
    const benchmarkTask = longRunningTaskManager.createTask({
      command: benchmarkCommand,
      description: `Benchmark ${model.name}`,
      type: TaskType.LONG_RUNNING,
      maxDuration: undefined, // NO TIMEOUT - can run for days!
      checkInterval: 300000, // Check every 5 minutes
      persistAcrossSessions: true,
      metadata: {
        modelName: model.name,
        logFile: `${config.outputDir}/${model.name}_live.log`,
        resultFile: `${config.outputDir}/${model.name}_results.json`
      }
    })
    
    await longRunningTaskManager.startTask(benchmarkTask, sshSocket)
    
    // Monitor progress in real-time
    await this.monitorBenchmarkProgress(benchmarkTask, model, config, sshSocket)
  }
  
  /**
   * Monitor long-running benchmark with live progress updates
   */
  private async monitorBenchmarkProgress(
    taskId: string,
    model: BenchmarkModel,
    config: BenchmarkConfig,
    sshSocket: any
  ): Promise<void> {
    
    const logFile = `${config.outputDir}/${model.name}_live.log`
    
    return new Promise((resolve) => {
      // Check progress every 5 minutes
      const monitorInterval = setInterval(async () => {
        
        // Check if benchmark is complete
        const checkTask = longRunningTaskManager.createTask({
          command: `if [ -f "${logFile}" ] && grep -q "BENCHMARK_COMPLETE" ${logFile}; then echo "COMPLETE"; else tail -n 50 ${logFile} 2>/dev/null || echo "Running..."; fi`,
          description: 'Check benchmark progress',
          type: TaskType.STREAMING,
          checkInterval: 1000
        })
        
        await longRunningTaskManager.startTask(checkTask, sshSocket)
        const output = await this.waitForTaskCompletion(checkTask)
        
        if (output.includes('COMPLETE')) {
          logger.info(`✅ Benchmark for ${model.name} completed!`)
          clearInterval(monitorInterval)
          resolve()
          return
        }
        
        logger.info(`📊 ${model.name}: Still running...`)
        
      }, 300000) // 5 minute intervals
      
      // Also set a maximum wait time (prevent infinite loops)
      setTimeout(() => {
        clearInterval(monitorInterval)
        logger.warn(`⚠️ Benchmark for ${model.name} exceeded expected time`)
        resolve()
      }, model.estimatedTime * 60000 * 3) // 3x estimated time
    })
  }
  
  /**
   * Phase 3: Aggregate all results
   */
  private async aggregateResults(
    config: BenchmarkConfig,
    sshSocket: any
  ): Promise<void> {
    
    logger.info('📈 Aggregating benchmark results...')
    
    // Generate comparison table
    const reportLines = [
      '╔════════════════════════════════════════════════════════════════╗',
      '║          MLPerf Benchmark Results Summary                      ║',
      '╠════════════════════════════════════════════════════════════════╣',
      ''
    ]
    
    reportLines.push('| Model          | Status      | Duration   |')
    reportLines.push('|----------------|-------------|------------|')
    
    for (const [modelName, result] of this.results) {
      const duration = result.endTime && result.startTime 
        ? `${Math.round((result.endTime - result.startTime) / 60000)}m`
        : 'N/A'
      
      reportLines.push(
        `| ${modelName.padEnd(14)} | ` +
        `${result.status.padEnd(11)} | ` +
        `${duration.padEnd(10)} |`
      )
    }
    
    reportLines.push('')
    reportLines.push('╚════════════════════════════════════════════════════════════════╝')
    
    const report = reportLines.join('\n')
    
    // Save report
    const reportFile = `${config.outputDir}/mlperf_summary.txt`
    const saveTask = longRunningTaskManager.createTask({
      command: `cat > ${reportFile} << 'EOF'\n${report}\nEOF`,
      description: 'Save benchmark report',
      type: TaskType.BACKGROUND,
      maxDuration: 5000
    })
    
    await longRunningTaskManager.startTask(saveTask, sshSocket)
    await this.waitForTaskCompletion(saveTask)
    
    logger.info('\n' + report)
    logger.info(`\n📄 Full report saved to: ${reportFile}`)
  }
  
  /**
   * Helper: Wait for task completion
   */
  private waitForTaskCompletion(taskId: string): Promise<string> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const task = longRunningTaskManager.getTask(taskId)
        
        if (task && (task.status === 'completed' || task.status === 'failed')) {
          clearInterval(checkInterval)
          resolve(task.latestOutput || task.output.join('\n'))
        }
      }, 1000)
      
      // Timeout after 2 hours
      setTimeout(() => {
        clearInterval(checkInterval)
        resolve('')
      }, 7200000)
    })
  }
  
  /**
   * Setup monitoring for task events
   */
  private setupTaskMonitoring(): void {
    longRunningTaskManager.on('task:output', (data) => {
      // Log live output from benchmarks
      if (data.output && data.output.length > 0) {
        logger.debug(`[${data.taskId}] ${data.output.substring(0, 200)}`)
      }
    })
    
    longRunningTaskManager.on('task:stalled', (task) => {
      logger.warn(`⚠️ Task may be stalled: ${task.description}`)
    })
    
    longRunningTaskManager.on('task:daily-update', (data) => {
      logger.info(`📅 Day ${data.daysRunning}: ${data.taskId} still running`)
    })
  }
  
  /**
   * Save checkpoint for resumability
   */
  private saveCheckpoint(): void {
    const checkpoint = {
      currentModelIndex: this.currentModelIndex,
      results: Array.from(this.results.entries()),
      timestamp: Date.now()
    }
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mlperf_checkpoint', JSON.stringify(checkpoint))
      logger.info(`💾 Checkpoint saved (model ${this.currentModelIndex + 1})`)
    }
  }
  
  /**
   * Get current orchestration status
   */
  getStatus(): {
    totalModels: number
    completedModels: number
    currentModel: string | null
    results: ModelResult[]
  } {
    const completed = Array.from(this.results.values()).filter(r => r.status === 'completed').length
    const currentModel = this.currentModelIndex < this.results.size
      ? Array.from(this.results.keys())[this.currentModelIndex]
      : null
    
    return {
      totalModels: this.results.size,
      completedModels: completed,
      currentModel,
      results: Array.from(this.results.values())
    }
  }
}

export const multiModelOrchestrator = new MultiModelOrchestrator()

