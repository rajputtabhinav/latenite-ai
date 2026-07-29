# 🔄 ReAct Loop Visual Flow Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SUBMITS TASK                        │
│                  "Check which OS I'm using"                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              handleAutonomousTerminalTask()                     │
│                                                                 │
│  • Creates assistant message                                    │
│  • Shows "Reactive Agent Activated"                             │
│  • Calls executeReactiveTask()                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  executeReactiveTask()                          │
│                    (ReAct Loop Begins)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ╔═══════════▼═══════════╗
                    ║   REACT LOOP START    ║
                    ║  (Max 10 iterations)  ║
                    ╚═══════════╤═══════════╝
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        │         ITERATION 1   │   ITERATION 2   ...  │
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐      ┌───────────────┐
│   STEP 1:     │       │   STEP 1:     │      │   STEP 1:     │
│   REASON      │       │   REASON      │      │   REASON      │
│ ──────────    │       │ ──────────    │      │ ──────────    │
│ Call AI with  │       │ Call AI with  │      │ Call AI with  │
│ task + empty  │       │ task + prev   │      │ task + full   │
│ history       │       │ observation   │      │ history       │
│               │       │               │      │               │
│ AI Returns:   │       │ AI Returns:   │      │ AI Returns:   │
│ THOUGHT: "Try │       │ THOUGHT: "Try │      │ THOUGHT:      │
│ Linux cmd"    │       │ Windows cmd"  │      │ "Complete!"   │
│ ACTION:       │       │ ACTION: ver   │      │ ACTION:       │
│ uname -a      │       │               │      │ TASK_COMPLETE │
└───────┬───────┘       └───────┬───────┘      └───────┬───────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐      ┌───────────────┐
│   STEP 2:     │       │   STEP 2:     │      │   STEP 2:     │
│   CHECK DONE  │       │   CHECK DONE  │      │   CHECK DONE  │
│ ──────────    │       │ ──────────    │      │ ──────────    │
│ isDone?       │       │ isDone?       │      │ isDone?       │
│ false ❌      │       │ false ❌      │      │ true ✅       │
└───────┬───────┘       └───────┬───────┘      └───────┬───────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       │
┌───────────────┐       ┌───────────────┐              │
│   STEP 3:     │       │   STEP 3:     │              │
│   ACT         │       │   ACT         │              │
│ ──────────    │       │ ──────────    │              │
│ Execute:      │       │ Execute:      │              │
│ uname -a      │       │ ver           │              │
└───────┬───────┘       └───────┬───────┘              │
        │                       │                       │
        ▼                       ▼                       │
┌───────────────┐       ┌───────────────┐              │
│   STEP 4:     │       │   STEP 4:     │              │
│   OBSERVE     │       │   OBSERVE     │              │
│ ──────────    │       │ ──────────    │              │
│ Result:       │       │ Result:       │              │
│ ERROR:        │       │ Windows 10    │              │
│ command not   │       │ Version info  │              │
│ found         │       │               │              │
└───────┬───────┘       └───────┬───────┘              │
        │                       │                       │
        ▼                       ▼                       │
┌───────────────┐       ┌───────────────┐              │
│   STEP 5:     │       │   STEP 5:     │              │
│   RECORD      │       │   RECORD      │              │
│ ──────────    │       │ ──────────    │              │
│ history.push({│       │ history.push({│              │
│  thought,     │       │  thought,     │              │
│  action,      │       │  action,      │              │
│  observation  │       │  observation  │              │
│ })            │       │ })            │              │
└───────┬───────┘       └───────┬───────┘              │
        │                       │                       │
        │                       │                       │
        └───────────┬───────────┘                       │
                    │                                   │
                    │                                   │
        ┌───────────▼──────────┐                        │
        │  Continue to next    │                        │
        │  iteration with      │                        │
        │  updated history     │                        │
        └──────────────────────┘                        │
                                                        │
                                                        │
                                    ╔═══════════════════▼═══════════════════╗
                                    ║      TASK COMPLETE - EXIT LOOP        ║
                                    ╚═══════════════════╤═══════════════════╝
                                                        │
                                                        ▼
                                            ┌───────────────────────┐
                                            │  Show final summary   │
                                            │  with all steps and   │
                                            │  observations         │
                                            └───────────┬───────────┘
                                                        │
                                                        ▼
                                            ┌───────────────────────┐
                                            │  Update UI with       │
                                            │  completion message   │
                                            │  ✅ Task Complete!    │
                                            └───────────────────────┘
```

## Detailed Iteration Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         SINGLE ITERATION                             │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────┐
    │  1. REASON (getNextAction)                              │
    │  ────────────────────────────────────────────────────   │
    │                                                          │
    │  Input:                                                  │
    │    • Task: "Check which OS I'm using"                    │
    │    • History: [{thought, action, observation}, ...]      │
    │    • Iteration: N                                        │
    │                                                          │
    │  Process:                                                │
    │    • Build context from history                          │
    │    • Create prompt with examples                         │
    │    • Call /api/ai/chat with Claude                       │
    │    • Parse response for THOUGHT and ACTION               │
    │                                                          │
    │  Output:                                                 │
    │    • thought: "The uname command failed..."              │
    │    • action: "ver"                                       │
    │    • isDone: false                                       │
    └────────────────────────┬────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  2. UPDATE UI                                            │
    │  ────────────────────────────────────────────────────   │
    │                                                          │
    │  Show in agent panel:                                    │
    │    Step N: [thought]                                     │
    │    ⚡ Running: `[action]`                                │
    │                                                          │
    │  Log to console:                                         │
    │    🔄 ReAct Iteration N/10                               │
    │    💭 Thought: [thought]                                 │
    │    ⚡ Action: [action]                                   │
    └────────────────────────┬────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  3. CHECK IF DONE                                        │
    │  ────────────────────────────────────────────────────   │
    │                                                          │
    │  if (isDone || action === 'TASK_COMPLETE') {             │
    │    Show completion summary                               │
    │    Break loop                                            │
    │    Return                                                │
    │  }                                                       │
    └────────────────────────┬────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  4. ACT (executeSSHCommand)                              │
    │  ────────────────────────────────────────────────────   │
    │                                                          │
    │  Execute command via WebSocket:                          │
    │    • Send command to terminal                            │
    │    • Wait for response                                   │
    │    • Capture output or error                             │
    │                                                          │
    │  Result:                                                 │
    │    • success: { output: "Windows 10..." }                │
    │    • or error: { message: "command not found" }          │
    └────────────────────────┬────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  5. OBSERVE                                              │
    │  ────────────────────────────────────────────────────   │
    │                                                          │
    │  try {                                                   │
    │    observation = commandResult.output                    │
    │  } catch (error) {                                       │
    │    observation = "ERROR: " + error.message               │
    │  }                                                       │
    │                                                          │
    │  Note: Errors become observations, not failures!         │
    └────────────────────────┬────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  6. RECORD                                               │
    │  ────────────────────────────────────────────────────   │
    │                                                          │
    │  history.push({                                          │
    │    thought: "The uname command failed...",               │
    │    action: "uname -a",                                   │
    │    observation: "ERROR: command not found"               │
    │  })                                                      │
    │                                                          │
    │  This history is used in next iteration!                 │
    └────────────────────────┬────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │  7. DELAY & CONTINUE                                     │
    │  ────────────────────────────────────────────────────   │
    │                                                          │
    │  await delay(1000ms)                                     │
    │  Continue to next iteration                              │
    └──────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ITERATION N                                  │
└─────────────────────────────────────────────────────────────────────┘

USER TASK: "Check which OS I'm using"
    │
    ├─► HISTORY (from previous iterations):
    │   [
    │     {
    │       thought: "I'll try a Linux command first",
    │       action: "uname -a",
    │       observation: "ERROR: command not found"
    │     }
    │   ]
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AI PROMPT CONSTRUCTION                                             │
│                                                                     │
│  You are an autonomous terminal agent.                              │
│  Your task is: "Check which OS I'm using"                           │
│                                                                     │
│  Previous actions and observations:                                 │
│  Iteration 1:                                                       │
│  Thought: I'll try a Linux command first                            │
│  Action: uname -a                                                   │
│  Observation: ERROR: command not found                              │
│                                                                     │
│  Based on the task and previous observations,                       │
│  what should you do next?                                           │
│                                                                     │
│  Respond with:                                                      │
│  THOUGHT: [your reasoning]                                          │
│  ACTION: [command to run or TASK_COMPLETE]                          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ POST /api/ai/chat
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AI RESPONSE                                                        │
│                                                                     │
│  THOUGHT: The uname command failed with 'command not found',        │
│  this is likely a Windows system. I should try the Windows          │
│  version command.                                                   │
│  ACTION: ver                                                        │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Parse response
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PARSED ACTION                                                      │
│                                                                     │
│  {                                                                  │
│    thought: "The uname command failed...",                          │
│    action: "ver",                                                   │
│    isDone: false                                                    │
│  }                                                                  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Execute via SSH
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  COMMAND EXECUTION                                                  │
│                                                                     │
│  WebSocket → Terminal: "ver"                                        │
│  Terminal → WebSocket: "Microsoft Windows [Version 10.0.26200.1]"  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Capture observation
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NEW HISTORY ENTRY                                                  │
│                                                                     │
│  {                                                                  │
│    thought: "The uname command failed...",                          │
│    action: "ver",                                                   │
│    observation: "Microsoft Windows [Version 10.0.26200.1]"         │
│  }                                                                  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Add to history array
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  UPDATED HISTORY (for next iteration)                               │
│                                                                     │
│  [                                                                  │
│    {                                                                │
│      thought: "I'll try a Linux command first",                     │
│      action: "uname -a",                                            │
│      observation: "ERROR: command not found"                        │
│    },                                                               │
│    {                                                                │
│      thought: "The uname command failed...",                        │
│      action: "ver",                                                 │
│      observation: "Microsoft Windows [Version 10.0.26200.1]"       │
│    }                                                                │
│  ]                                                                  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Loop continues with updated history
                          │
                          ▼
                  ┌────────────────┐
                  │ Next Iteration │
                  │   (AI will see │
                  │ Windows output │
                  │  and complete) │
                  └────────────────┘
```

## State Machine

```
                  ┌─────────────┐
                  │    START    │
                  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  REASONING  │◄─────────┐
                  └──────┬──────┘          │
                         │                 │
                         ▼                 │
                  ┌─────────────┐          │
         ┌───────►│   ACTING    │          │
         │        └──────┬──────┘          │
         │               │                 │
         │               ▼                 │
         │        ┌─────────────┐          │
         │        │  OBSERVING  │          │
         │        └──────┬──────┘          │
         │               │                 │
         │               ▼                 │
         │        ┌─────────────┐          │
         │        │  RECORDING  │          │
         │        └──────┬──────┘          │
         │               │                 │
         │               ▼                 │
         │        ┌─────────────┐          │
         │    ┌───┤  COMPLETE?  ├──NO──────┘
         │    │   └─────────────┘
         │    │YES
         │    ▼
         │ ┌─────────────┐
         │ │     DONE    │
         │ └─────────────┘
         │
         │ MAX ITERATIONS
         └────────────────────────┐
                                  │
                                  ▼
                          ┌─────────────┐
                          │   TIMEOUT   │
                          └─────────────┘
```

## Comparison: Old vs New

### OLD (Static Planning)

```
User Task
    │
    ▼
┌─────────────┐
│Generate Plan│ ◄─── Single AI call
└──────┬──────┘
       │
       │ Plan: [cmd1, cmd2, cmd3]
       │
       ▼
┌─────────────┐
│Execute cmd1 │ ───► Success or Fail (no adaptation)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Execute cmd2 │ ───► Success or Fail (no adaptation)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Execute cmd3 │ ───► Success or Fail (no adaptation)
└──────┬──────┘
       │
       ▼
    Done
```

### NEW (ReAct Loop)

```
User Task
    │
    │
    │  ╔══════════════════╗
    └─►║  ReAct Loop      ║
       ║                  ║
       ║ AI Call 1 ────►  ║ ──► Decides cmd1
       ║ Execute   ────►  ║ ──► Run it
       ║ Observe   ────►  ║ ──► Capture result
       ║                  ║
       ║ AI Call 2 ────►  ║ ──► Adapts based on result
       ║ Execute   ────►  ║ ──► Run different cmd
       ║ Observe   ────►  ║ ──► Capture result
       ║                  ║
       ║ AI Call 3 ────►  ║ ──► Sees success, completes
       ║                  ║
       ╚═════════╤════════╝
                 │
                 ▼
              Done
```

## Key Insight

The magic of ReAct is in the **feedback loop**:

```
      ┌──────────────────────────────────┐
      │                                  │
      │  Each observation influences     │
      │  the next action                 │
      │                                  │
      └──────────────────────────────────┘
                    │
                    ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Action  │───►│  Obs    │───►│ Action  │
│   1     │    │   1     │    │   2     │
└─────────┘    └─────────┘    └─────────┘
   uname          ERROR           ver
  (Linux)    (not Linux)      (Windows)
```

This creates an **adaptive system** that learns from each step!

---

**Legend**:
- 🧠 = AI Reasoning
- ⚡ = Action/Execution  
- 📊 = Observation/Result
- ✅ = Success/Complete
- ❌ = Error/Failure
- 🔄 = Loop/Iteration

