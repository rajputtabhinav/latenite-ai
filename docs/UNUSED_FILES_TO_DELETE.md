# 🗑️ UNUSED FILES TO DELETE

Based on codebase analysis, these files appear to be unused or duplicate:

## ❌ **Confirmed Unused (Safe to Delete)**

1. **app/lib/os-agent-demo.ts** - Demo file, not imported anywhere
2. **Several lib files are only imported by each other** - Circular references indicate dead code

## ⚠️ **Need Verification (Check if Used)**

### **Duplicate Command Execution Systems:**
1. **app/lib/enhanced-agent-terminal-bridge.ts** - Used by EnhancedTaskExecutor.tsx
2. **app/lib/autonomous-task-executor.ts** - Used by autonomous-os-agent.ts
3. **app/lib/enhanced-intelligent-task-executor.ts** - Used by other lib files
4. **app/lib/os-agent-integration.ts** - Used by workflow, autonomous-os-agent
5. **app/lib/workflow-automation-engine.ts** - Used by autonomous-os-agent
6. **app/lib/advanced-command-executor.ts** - Used by os-agent-integration
7. **app/lib/terminal-state-manager.ts** - Need to check
8. **app/lib/websocket-terminal.ts** - Need to check

### **Components Using These:**
1. **app/components/EnhancedTaskExecutor.tsx** - UI component for enhanced execution
2. **app/components/TerminalEnhancedIntegration.tsx** - Integration component

## 🎯 **Recommendation**

**Current AIAgent.tsx only uses:**
- `TerminalAgentController` from `terminal-agent-integration.ts`
- `agentTerminalBridge` from `agent-terminal-bridge.ts`

**All other files appear to be:**
- Experimental features not integrated
- Duplicate implementations
- Over-engineered solutions

**Action Plan:**
1. Keep: `agent-terminal-bridge.ts`, `terminal-agent-integration.ts`
2. Move unused files to `/archive` folder (don't delete yet - just in case)
3. Test that app still works
4. After 1 week, permanently delete if not needed

**Files to Archive (~15 files):**
- All the "enhanced-*" files
- All the "autonomous-*" files (except what's actively used)
- workflow-automation-engine.ts
- os-agent-demo.ts
- terminal-state-manager.ts (if not used)
- websocket-terminal.ts (if not used)

**Expected Impact:**
- Cleaner codebase
- Faster builds (less code to process)
- Less confusion
- Easier maintenance

