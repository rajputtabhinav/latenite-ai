# 🧪 Quick Test Guide - Reactive Agent

## How to Test the New ReAct Architecture

### Prerequisites
1. Start the development server: `npm run dev`
2. Connect to SSH terminal
3. Wait for terminal to be ready (green indicator)

### Test 1: OS Detection (The Core Scenario)

**Input**: "Check which OS I'm using"

**What to Watch For**:
1. Agent shows: "Reactive Agent Activated"
2. Mode displays: "Dynamic ReAct Loop (Reason → Act → Observe)"
3. You see iterations:
   - **Step 1**: AI tries a command (e.g., `uname -a`)
   - If it fails: **Step 2**: AI adapts and tries different command (e.g., `ver`)
   - **Final**: Task complete with correct OS info

**Expected Console Output**:
```
🚀 Starting autonomous terminal task with REACTIVE AGENT: "Check which OS I'm using"
🧠 AI Reasoning - Iteration 1
💭 Thought: I need to determine the OS type. Let me try a Linux command first.
⚡ Action: uname -a
💻 Executing: uname -a
❌ Observation (Error): ERROR: command not found
🔄 ReAct Iteration 2/10
🧠 AI Reasoning - Iteration 2
💭 Thought: The uname command failed, this is likely Windows. Let me try ver.
⚡ Action: ver
💻 Executing: ver
📊 Observation: Microsoft Windows [Version 10.0.26200.1]
🔄 ReAct Iteration 3/10
🧠 AI Reasoning - Iteration 3
💭 Thought: I have successfully identified the OS.
⚡ Action: TASK_COMPLETE
✅ Task completed after 3 iterations
```

### Test 2: Disk Space Check

**Input**: "Check my disk space"

**What to Watch For**:
- AI tries appropriate command for detected OS
- If wrong OS detected, it adapts
- Shows disk usage information

### Test 3: List Files in Current Directory

**Input**: "Show me files in current directory"

**What to Watch For**:
- AI decides between `ls -la` (Linux) or `dir` (Windows)
- Adapts if first command fails
- Shows file listing

### Test 4: Check Memory Usage

**Input**: "How much memory am I using?"

**What to Watch For**:
- AI tries `free -h` (Linux) or `systeminfo` (Windows)
- Self-corrects if wrong
- Shows memory stats

## 🎯 Success Criteria

✅ **Adaptation**: Agent changes strategy when commands fail  
✅ **Visibility**: You can see AI's reasoning at each step  
✅ **Recovery**: Errors don't crash the agent, they inform next step  
✅ **Completion**: Task completes successfully with correct information  
✅ **UI Updates**: Real-time updates showing progress

## ❌ What NOT to See (Old Behavior)

❌ Pre-generated static plan showing all steps upfront  
❌ Agent giving up after first failed command  
❌ Wrong OS commands being run without correction  
❌ No visible reasoning process

## 🔍 Debugging

### Check Browser Console

Open DevTools and look for:
```javascript
🚀 Starting autonomous terminal task with REACTIVE AGENT
🧠 AI Reasoning - Iteration N
💭 Thought: [reasoning]
⚡ Action: [command]
📊 Observation: [result]
```

### Check Network Tab

Look for requests to `/api/ai/chat` with:
- Request body containing task + history
- Response containing THOUGHT and ACTION

### Common Issues

**Issue**: Agent doesn't adapt
- **Check**: Make sure you see "REACTIVE AGENT" in the activation message
- **Fix**: Verify `handleAutonomousTerminalTask` is calling `executeReactiveTask`

**Issue**: Infinite loop (maxes out at 10 iterations)
- **Check**: AI might not be sending "TASK_COMPLETE"
- **Fix**: Check AI response parsing in `getNextAction()`

**Issue**: No AI reasoning shown
- **Check**: API call to `/api/ai/chat` might be failing
- **Fix**: Verify API route is working and model is correct

## 📊 Comparison Test

Want to see the difference? You can temporarily add logging to compare:

1. Old approach: Used `generateIntelligentExecutionPlan()` - static plan
2. New approach: Uses `executeReactiveTask()` - dynamic loop

The key difference:
- **Old**: One AI call at start → generate full plan → execute blindly
- **New**: Multiple AI calls → each with updated context → adaptive execution

## 🎓 Understanding the Logs

```
🔄 ReAct Iteration 2/10        ← Loop iteration count
🧠 AI Reasoning               ← About to call AI
💭 Thought: [text]            ← AI's reasoning
⚡ Action: [command]          ← What AI decided to do
💻 Executing: [command]       ← Actually running the command
📊 Observation: [output]      ← What we got back
❌ Observation (Error): [err] ← If command failed (not a crash!)
✅ Task completed after N     ← Success!
```

## 🚀 Advanced Testing

Try these complex scenarios:

1. **"Set up nginx and check if it's running"**
   - Watch multi-step reasoning
   - See how it verifies each step

2. **"Find the largest files in my home directory"**
   - Watch OS-specific command selection
   - See adaptation if commands aren't available

3. **"Check if port 3000 is in use"**
   - Different approaches on different OS
   - Adaptive tool selection

## 📝 Test Checklist

- [ ] Agent activates with "Reactive Agent" message
- [ ] Shows "Dynamic ReAct Loop" mode
- [ ] Displays iteration-by-iteration reasoning
- [ ] Adapts when commands fail
- [ ] Completes task successfully
- [ ] Browser console shows ReAct loop logs
- [ ] UI updates in real-time
- [ ] Final message shows task completion

---

**Next Steps**: If all tests pass, the ReAct architecture is working correctly! 🎉

**Rollback**: If needed, you can revert `handleAutonomousTerminalTask` to use `generateIntelligentExecutionPlan` + `executeTerminalTaskWithVerification` (legacy functions still exist).

