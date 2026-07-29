# 🧪 UI Testing Guide - AI Agent Enhancements

## Quick Visual Test Checklist

### Test 1: Enhanced Status Bar ✅
**What to do:**
1. Open AI Agent
2. Connect SSH  
3. Enable MCP in settings

**Expected Result:**
```
Status Bar should show:
● Ready | 💻 SSH Live (user@host) | 📚 Docs Ready
```

**Verify:**
- [ ] Green "Ready" indicator
- [ ] Blue "SSH Live" badge appears when connected
- [ ] Cyan "Docs Ready" badge appears when MCP enabled
- [ ] All badges have smooth animations

---

### Test 2: Terminal Status Panel ✅
**What to do:**
1. Connect to SSH server
2. Run a command in terminal (e.g., `ls`, `pwd`)

**Expected Result:**
```
Panel appears showing:
💻 Terminal Live [v]
   user@192.168.1.104:~/
   [●Connected]
```

**Verify:**
- [ ] Panel appears only when SSH connected
- [ ] Shows correct user@host:path
- [ ] Green "Connected" badge visible
- [ ] Click to expand shows last 3 terminal lines
- [ ] Output updates in real-time
- [ ] Collapsible with smooth animation

---

### Test 3: Documentation Indicator ✅
**What to do:**
1. Enable MCP
2. Ask: "Install PyTorch for GPU" or "Set up MLPerf benchmarking"

**Expected Result:**
```
Blue badge appears above AI response:
✨ Auto-fetched Documentation
   PyTorch, CUDA
```

**Verify:**
- [ ] Badge appears before agent response
- [ ] Shows correct library names
- [ ] Sparkle animation on appear
- [ ] Click to expand shows library pills
- [ ] Timestamp displayed
- [ ] Blue color scheme

---

### Test 4: Long-Running Task Panel ✅
**What to do:**
1. Tell agent: "Monitor system with top" (streaming task)
2. Or: "Run sleep 300" (5-minute background task)

**Expected Result:**
```
Panel appears with task card:
🕐 Long-Running Tasks (1) [v]
┌─────────────────────────────┐
│ 📡 Streaming      [spin]    │
│ System Monitoring           │
│ 🕐 0m 15s                   │
│ [Details] [Pause] [Cancel]  │
└─────────────────────────────┘
```

**Verify:**
- [ ] Panel appears when task starts
- [ ] Correct task type badge (📡/🔄/⏳/🗓️)
- [ ] Elapsed time updates every second
- [ ] Progress bar shows (if task has progress)
- [ ] Pause button works
- [ ] Cancel button works
- [ ] Details button opens timeline modal
- [ ] Panel disappears when task completes

---

### Test 5: Task Timeline Modal ✅
**What to do:**
1. Start a long task
2. Click "Details" button on task card

**Expected Result:**
```
Modal opens showing:
Task Timeline
12 events

● 12:00:00 PM - Task Started
│  MLPerf Benchmark initiated
●  1:00:15 PM - Checkpoint
│  Model 1 at 50%
🔄 2:15:23 PM - Progress Update ● Live
   Currently running...
```

**Verify:**
- [ ] Modal opens on "Details" click
- [ ] Timeline shows all events
- [ ] Colored dots for event types
- [ ] Timestamps are correct
- [ ] Latest event has "Live" indicator
- [ ] Can scroll if many events
- [ ] Click outside to close
- [ ] X button closes modal

---

### Test 6: Multi-Task Scenario ✅
**What to do:**
1. Start task 1: "Monitor with top"
2. Start task 2: "Run sleep 300"

**Expected Result:**
```
Status Bar: 🕐 2 active
Long-Running Task Panel shows 2 cards
Each task updates independently
```

**Verify:**
- [ ] Task count in status bar updates
- [ ] Both tasks shown in panel
- [ ] Each has independent controls
- [ ] Each updates separately
- [ ] Can pause/cancel individually

---

### Test 7: Documentation with Long Task ✅
**What to do:**
1. Enable MCP
2. Say: "Benchmark ResNet50 and BERT with MLPerf"

**Expected Result:**
```
1. Doc indicator shows: MLPerf, PyTorch, Transformers, CUDA
2. Task panel shows multi-day task
3. Status bar shows both MCP and task active
4. Timeline starts recording events
```

**Verify:**
- [ ] All UI elements appear
- [ ] No conflicts or overlaps
- [ ] Smooth animations
- [ ] Proper color coding
- [ ] All controls functional

---

## 🔍 Visual Inspection

### Color Coding Check:
- **Purple** badges = Multi-day tasks
- **Blue** badges = Long-running tasks / Docs / SSH
- **Green** badges = Background tasks / Connected / Success
- **Yellow** badges = Streaming tasks / Working
- **Cyan** badges = MCP / Progress bars
- **Red** badges = Errors / Cancel

### Animation Check:
- **Pulse**: Connection indicators, live badges
- **Spin**: Loading indicators, active tasks
- **Slide**: Panel expand/collapse
- **Fade**: Modal open/close
- **Progress**: Bar animations

### Spacing Check:
- Headers: 4px padding
- Panels: 2-3px gaps
- Buttons: 2px gaps between
- Text: Proper line-height

---

## 🐛 Common Issues & Fixes

### Issue 1: Panel Not Showing
**Problem:** Long-Running Task Panel doesn't appear

**Check:**
- Is a task actually running? Check `activeLongRunningTasks.size > 0`
- Is component imported correctly?
- Check browser console for errors

**Fix:**
```typescript
// Verify task manager is loaded
console.log(longRunningTaskManager)
console.log(activeLongRunningTasks)
```

---

### Issue 2: Documentation Badge Not Showing
**Problem:** Docs fetched but badge doesn't appear

**Check:**
- Is MCP enabled?
- Does message have metadata.docsAutoFetched?
- Check console for fetch logs

**Fix:**
```typescript
// Verify message metadata
console.log(messages[messages.length - 1].metadata)
```

---

### Issue 3: Status Bar Not Updating
**Problem:** Active task count doesn't update

**Check:**
- Are task events being emitted?
- Is useEffect hook running?
- Check event listeners

**Fix:**
```typescript
// Add debug logging
longRunningTaskManager.on('task:created', (task) => {
  console.log('Task created:', task)
})
```

---

## ✅ Final Verification

Run through this checklist:

**Basic UI:**
- [ ] Agent opens smoothly
- [ ] All panels render without errors
- [ ] No console errors
- [ ] Responsive to window resize

**Status Bar:**
- [ ] Shows AI status correctly
- [ ] SSH badge appears/disappears correctly
- [ ] MCP badge appears when enabled
- [ ] Task count updates in real-time

**Panels:**
- [ ] Terminal panel shows when SSH connected
- [ ] Task panel shows when tasks active
- [ ] All panels collapsible
- [ ] Smooth animations

**Documentation:**
- [ ] Indicator appears when docs fetched
- [ ] Shows correct library names
- [ ] Expandable/collapsible
- [ ] Proper styling

**Task Controls:**
- [ ] Pause button works
- [ ] Resume button works
- [ ] Cancel button works
- [ ] Details opens timeline

**Timeline:**
- [ ] Modal opens correctly
- [ ] Shows all events
- [ ] Timestamps correct
- [ ] Live indicator on latest
- [ ] Can close modal

---

## 🎯 Success Criteria

✅ All 5 improvements visible and functional
✅ No linter errors
✅ No console errors
✅ Smooth animations
✅ Proper color coding
✅ Responsive layout
✅ Controls work correctly
✅ Real-time updates working

**If all checkboxes pass, the implementation is PERFECT!** ✨

---

## 📞 Next Steps

1. **Test each improvement** using this guide
2. **Report any issues** found during testing
3. **Enjoy the enhanced UI!** 🎉

**The AI Agent is now visually on par with top commercial tools!** 🏆

