# 🏆 MLPerf Multi-Model Benchmark - Usage Example

## Quick Start: Benchmark 6 Models Automatically

### Step 1: User Request
Simply tell the agent:
```
"Run MLPerf benchmarks on ResNet50, BERT, GPT-2, YOLO, MobileNet, and EfficientNet"
```

### Step 2: Agent Auto-Orchestration

The agent will automatically:

**Phase 1: Planning** (Instant)
```typescript
import { multiModelOrchestrator, BenchmarkConfig } from '@/lib/multi-model-orchestrator'

// Agent creates configuration
const config: BenchmarkConfig = {
  models: [
    { name: 'ResNet50', huggingfaceId: 'microsoft/resnet-50', estimatedTime: 480 },
    { name: 'BERT', huggingfaceId: 'bert-base-uncased', estimatedTime: 360 },
    { name: 'GPT-2', huggingfaceId: 'gpt2', estimatedTime: 420 },
    { name: 'YOLO', huggingfaceId: 'ultralytics/yolov5', estimatedTime: 300 },
    { name: 'MobileNet', huggingfaceId: 'google/mobilenet_v2_1.0_224', estimatedTime: 240 },
    { name: 'EfficientNet', huggingfaceId: 'google/efficientnet-b0', estimatedTime: 280 }
  ],
  dataset: '/data/imagenet',
  iterations: 1000,
  outputDir: '/results/mlperf'
}

// Start orchestration
const taskId = await multiModelOrchestrator.runMLPerfBenchmark(config, sshSocket)
```

**Phase 2: Execution** (3-5 days, fully automated)

```bash
╔════════════════════════════════════════════════════════╗
║  MLPerf Multi-Model Benchmark Execution Log           ║
╠════════════════════════════════════════════════════════╣

[Day 1 00:00:00] 🚀 Starting MLPerf Orchestration
[Day 1 00:00:01] 📋 Planning complete: 6 models, 40 steps
[Day 1 00:00:02] 🔧 Phase 1: Environment Setup

[Day 1 00:00:10] ├─ Checking GPU availability
[Day 1 00:00:11] │  ✅ NVIDIA Tesla V100 detected
[Day 1 00:00:11] │  ✅ CUDA 11.8 ready
[Day 1 00:00:11] │
[Day 1 00:05:00] ├─ Installing MLPerf dependencies
[Day 1 00:15:00] │  ✅ mlperf-loadgen installed
[Day 1 00:15:00] │  ✅ transformers installed
[Day 1 00:15:00] │
[Day 1 00:30:00] └─ ✅ Environment setup complete

[Day 1 00:30:01] ╔══════════════════════════════════════════╗
[Day 1 00:30:01] ║  📊 Benchmarking Model 1/6: ResNet50    ║
[Day 1 00:30:01] ╚══════════════════════════════════════════╝

[Day 1 00:30:02] 📥 Downloading model weights...
[Day 1 00:30:03] ├─ Source: microsoft/resnet-50
[Day 1 00:30:04] ├─ Size: 2.1 GB
[Day 1 01:15:32] └─ ✅ Download complete

[Day 1 01:15:33] 🔥 Running warmup iterations...
[Day 1 01:15:34] ├─ Iteration 1/10... 125ms
[Day 1 01:15:35] ├─ Iteration 5/10... 122ms
[Day 1 01:15:36] └─ ✅ Warmup complete (avg: 123ms)

[Day 1 01:15:37] ⚡ Starting benchmark (1000 iterations)
[Day 1 01:15:38] ├─ Starting in screen session: mlperf_ResNet50
[Day 1 01:15:39] └─ Monitoring every 5 minutes...

[Day 1 01:20:00] 📊 Progress Update:
[Day 1 01:20:00] ├─ Iterations: 42/1000 (4%)
[Day 1 01:20:00] ├─ Throughput: 1245 samples/sec
[Day 1 01:20:00] ├─ Latency: 3.24ms avg
[Day 1 01:20:00] ├─ GPU Utilization: 87%
[Day 1 01:20:00] └─ ETA: ~7.5 hours

[Day 1 02:20:00] 📊 Progress Update:
[Day 1 02:20:00] ├─ Iterations: 125/1000 (12.5%)
[Day 1 02:20:00] ├─ Throughput: 1248 samples/sec
[Day 1 02:20:00] └─ ETA: ~6.8 hours

[Day 1 04:20:00] 📊 Progress Update:
[Day 1 04:20:00] ├─ Iterations: 312/1000 (31%)
[Day 1 04:20:00] ├─ Throughput: 1251 samples/sec
[Day 1 04:20:00] └─ ETA: ~5.1 hours

[Day 1 08:20:00] 📊 Progress Update:
[Day 1 08:20:00] ├─ Iterations: 785/1000 (78.5%)
[Day 1 08:20:00] ├─ Throughput: 1247 samples/sec
[Day 1 08:20:00] └─ ETA: ~1.5 hours

[Day 1 09:45:23] ✅ Benchmark complete!
[Day 1 09:45:23] ├─ Total iterations: 1000
[Day 1 09:45:23] ├─ Duration: 8h 29m 46s
[Day 1 09:45:23] ├─ Avg throughput: 1248.3 samples/sec
[Day 1 09:45:23] ├─ Avg latency: 3.24ms
[Day 1 09:45:23] ├─ Accuracy: 94.2%
[Day 1 09:45:23] └─ GPU avg: 87%

[Day 1 09:45:24] 💾 Checkpoint saved: Model 1/6 complete

[Day 1 09:45:25] ╔══════════════════════════════════════════╗
[Day 1 09:45:25] ║  📊 Benchmarking Model 2/6: BERT        ║
[Day 1 09:45:25] ╚══════════════════════════════════════════╝

[Day 1 09:45:26] 📥 Downloading model weights...
[... continues for each model ...]

[Day 4 18:00:00] ✅ All 6 models benchmarked successfully!

[Day 4 18:00:01] 📈 Phase 3: Aggregating Results

[Day 4 18:05:12] ╔════════════════════════════════════════════════════════╗
[Day 4 18:05:12] ║      MLPerf Benchmark Results Summary                  ║
[Day 4 18:05:12] ╠════════════════════════════════════════════════════════╣
[Day 4 18:05:12] ║                                                        ║
[Day 4 18:05:12] ║  Model          | Throughput | Latency | Accuracy     ║
[Day 4 18:05:12] ║  --------------|------------|---------|----------     ║
[Day 4 18:05:12] ║  ResNet50       | 1248.3     | 3.24    | 94.2%        ║
[Day 4 18:05:12] ║  BERT           | 342.7      | 11.43   | 91.5%        ║
[Day 4 18:05:12] ║  GPT-2          | 198.4      | 18.75   | 88.9%        ║
[Day 4 18:05:12] ║  YOLO           | 87.2       | 45.32   | 86.3%        ║
[Day 4 18:05:12] ║  MobileNet      | 2341.8     | 1.56    | 89.7%        ║
[Day 4 18:05:12] ║  EfficientNet   | 1876.5     | 2.01    | 92.4%        ║
[Day 4 18:05:12] ║                                                        ║
[Day 4 18:05:12] ╚════════════════════════════════════════════════════════╝

[Day 4 18:10:45] 📄 Reports saved:
[Day 4 18:10:45] ├─ /results/mlperf/mlperf_summary.txt
[Day 4 18:10:45] ├─ /results/mlperf/ResNet50_results.json
[Day 4 18:10:45] ├─ /results/mlperf/BERT_results.json
[Day 4 18:10:45] ├─ /results/mlperf/GPT-2_results.json
[Day 4 18:10:45] ├─ /results/mlperf/YOLO_results.json
[Day 4 18:10:45] ├─ /results/mlperf/MobileNet_results.json
[Day 4 18:10:45] └─ /results/mlperf/EfficientNet_results.json

[Day 4 18:11:00] 🎉 MLPerf Benchmark Orchestration Complete!
[Day 4 18:11:00] ├─ Total Duration: 4 days, 17 hours, 41 minutes
[Day 4 18:11:00] ├─ Models Completed: 6/6
[Day 4 18:11:00] ├─ Models Failed: 0
[Day 4 18:11:00] └─ Success Rate: 100%

╚════════════════════════════════════════════════════════╝
```

---

## Manual Usage (Advanced)

### Direct API Call

```typescript
import { multiModelOrchestrator, BenchmarkConfig } from '@/lib/multi-model-orchestrator'

// Define your benchmark configuration
const config: BenchmarkConfig = {
  models: [
    {
      name: 'ResNet50',
      huggingfaceId: 'microsoft/resnet-50',
      estimatedTime: 480, // 8 hours
      batchSizes: [32, 64, 128],
      precision: ['fp32', 'fp16']
    },
    {
      name: 'BERT',
      huggingfaceId: 'bert-base-uncased',
      estimatedTime: 360, // 6 hours
      batchSizes: [16, 32],
      precision: ['fp32']
    }
  ],
  dataset: '/data/imagenet',
  iterations: 1000,
  gpuType: 'Tesla V100',
  outputDir: '/results/mlperf_custom'
}

// Start the benchmark
const taskId = await multiModelOrchestrator.runMLPerfBenchmark(
  config,
  sshSocket // Your SSH socket connection
)

// Monitor progress
setInterval(() => {
  const status = multiModelOrchestrator.getStatus()
  console.log(`Progress: ${status.completedModels}/${status.totalModels}`)
  console.log(`Current Model: ${status.currentModel}`)
}, 60000) // Check every minute
```

---

## Monitoring Live Progress

```typescript
import { longRunningTaskManager } from '@/lib/long-running-task-manager'

// Subscribe to task events
longRunningTaskManager.on('task:output', (data) => {
  console.log(`[${data.taskId}] ${data.output}`)
  if (data.progress) {
    console.log(`Progress: ${data.progress}%`)
  }
})

longRunningTaskManager.on('task:progress', (data) => {
  console.log(`Task ${data.taskId}: ${data.progress}%`)
  console.log(`Latest: ${data.latestOutput}`)
})

longRunningTaskManager.on('task:completed', (task) => {
  console.log(`✅ Task ${task.description} completed!`)
  console.log(`Duration: ${(task.endTime! - task.startTime) / 1000}s`)
})

longRunningTaskManager.on('task:daily-update', (data) => {
  console.log(`📅 Day ${data.daysRunning} Update:`)
  console.log(`Task ${data.taskId} still running`)
  console.log(`Status: ${data.status}`)
})

longRunningTaskManager.on('task:stalled', (task) => {
  console.warn(`⚠️ Task ${task.id} may be stalled`)
  console.warn(`No output for ${Date.now() - task.lastUpdateTime}ms`)
})
```

---

## Control Tasks

```typescript
// Get all active tasks
const activeTasks = longRunningTaskManager.getActiveTasks()
console.log(`Active tasks: ${activeTasks.length}`)

// Get specific task
const task = longRunningTaskManager.getTask(taskId)
console.log(`Status: ${task?.status}`)
console.log(`Progress: ${task?.progress}%`)

// Pause task
await longRunningTaskManager.pauseTask(taskId)

// Resume task
await longRunningTaskManager.resumeTask(taskId, sshSocket)

// Cancel task
await longRunningTaskManager.cancelTask(taskId, sshSocket)
```

---

## Real-World Use Cases

### 1. Hardware Certification
```typescript
const config = {
  models: ['ResNet50', 'BERT', 'GPT-2', 'YOLO'],
  dataset: '/data/certification',
  iterations: 10000,
  outputDir: '/results/certification'
}

// Runs for 7-10 days
// Generates official certification report
```

### 2. Performance Comparison
```typescript
const config = {
  models: ['ModelA_v1', 'ModelA_v2', 'ModelA_v3'],
  dataset: '/data/test',
  iterations: 5000,
  outputDir: '/results/comparison'
}

// Compare multiple versions
// Identify best performing model
```

### 3. Continuous Benchmarking
```typescript
const config = {
  models: ['ProductionModel'],
  dataset: '/data/production',
  iterations: 50000,
  outputDir: '/results/continuous'
}

// Run monthly benchmarks
// Track performance over time
// Detect regressions
```

---

## Expected Output Files

After completion, you'll find:

```
/results/mlperf/
├── mlperf_summary.txt           # Human-readable summary
├── ResNet50_results.json        # Detailed metrics
├── ResNet50_live.log            # Full execution log
├── BERT_results.json
├── BERT_live.log
├── GPT-2_results.json
├── GPT-2_live.log
├── YOLO_results.json
├── YOLO_live.log
├── MobileNet_results.json
├── MobileNet_live.log
├── EfficientNet_results.json
└── EfficientNet_live.log
```

---

## Tips & Best Practices

### 1. Estimate Time Accurately
```typescript
// Underestimate = longer monitoring
// Overestimate = unnecessary waiting
estimatedTime: 480 // minutes (be realistic!)
```

### 2. Use Screen Sessions
```typescript
// Automatically done for multi-day tasks
// Survives SSH disconnects
// Can reconnect with: screen -r mlperf_ModelName
```

### 3. Monitor Checkpoints
```typescript
// Check checkpoint file regularly
const checkpoint = JSON.parse(
  localStorage.getItem('mlperf_checkpoint')
)
console.log(`Completed: ${checkpoint.currentModelIndex} models`)
```

### 4. Handle Failures Gracefully
```typescript
// Orchestrator continues on model failure
// Check results.status for each model
results.forEach(result => {
  if (result.status === 'failed') {
    console.log(`${result.modelName} failed: ${result.errors}`)
  }
})
```

---

## Troubleshooting

### Task Not Starting
```bash
# Check if task manager loaded
console.log(longRunningTaskManager) // Should not be null

# Check SSH connection
socket.connected // Should be true
```

### Progress Not Updating
```bash
# Check log file exists
ls -la /tmp/latenite_task_*.log

# Read log manually
tail -f /tmp/latenite_task_taskId.log
```

### Task Stalled
```bash
# Check if screen session exists
screen -list | grep mlperf

# Reattach to see live output
screen -r mlperf_ModelName
```

---

## 🎉 That's It!

Your agent can now handle **multi-day, multi-model benchmarking** completely autonomously!

Just say: **"Benchmark these 6 models"** and walk away for 3-5 days. ✨

