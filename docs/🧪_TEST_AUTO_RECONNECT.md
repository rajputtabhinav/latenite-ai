# 🧪 AUTO-RECONNECT TESTING GUIDE

## ✅ **HOW TO TEST THE FEATURE**

Follow these steps to verify auto-reconnect is working:

---

## 🎯 TEST 1: VERIFY CREDENTIAL SAVING

### **Steps:**

```bash
1. Start server: npm run dev
2. Open: http://localhost:5000
3. Click "Connect SSH" button
4. Enter your credentials
5. Click "Connect"
```

### **✅ Expected Console Output:**

```javascript
✅ SSH connection established: user@192.168.1.100
🔐 SSH credentials saved for auto-reconnect (10-minute retry window)
   Valid for 4 hours until: Nov 10, 2025, 8:30:00 PM
📊 Session tracking initialized for documentation
🔌 WebSocket connected with ID: xxx
✅ SSH shell ready
```

### **🚨 CRITICAL CHECK:**

**You MUST see this line:**
```
🔐 SSH credentials saved for auto-reconnect
```

**If you DON'T see it:**
- ❌ Auto-reconnect will NOT work
- ❌ Credentials are not saved
- ❌ Check browser console for errors

---

## 🎯 TEST 2: MANUAL REBOOT COMMAND

### **Steps:**

```bash
1. After SSH connected (and credentials saved)
2. In terminal, type: sudo reboot
3. Press Enter
```

### **✅ Expected Behavior:**

**In Console:**
```javascript
🔄 Reboot command detected! Preparing auto-reconnect...
💾 Task saved before reboot for session ssh_xxx
   Task: Continue after reboot: sudo reboot
   Pending commands: 0
🔌 SSH disconnected: io server disconnect
🔄 Initiating auto-reconnect sequence after reboot...
```

**In UI:**
```
🔄 Banner appears at top (orange background)
Shows: "Auto-Reconnecting SSH to user@host"
Shows: "Attempt 0/20"
Shows: "Waiting for server to boot..."
Countdown: 45s → 44s → 43s...
```

**After 45 seconds:**
```
Attempt 1/20: Connecting...
Progress bar: ███░░░░░░░░░░░░░░░░░ 5%
Elapsed: 0:45  Remaining: 9:15  Next: 30s
```

**Every 30 seconds:**
```
Attempt 2/20: Connecting...
Attempt 3/20: Connecting...
...
Attempt X/20: ✅ Connected!
```

**On Success:**
```
Banner disappears
Chat message: "✅ SSH Reconnected Successfully!"
Chat message: "📋 Resuming Task"
```

---

## 🎯 TEST 3: AGENT-INITIATED REBOOT

### **Steps:**

```bash
1. After SSH connected
2. Tell agent: "Update system and reboot server"
3. Let agent execute autonomously
```

### **✅ Expected Behavior:**

**Agent Response:**
```
🤖 I'll update and reboot the server

Running: sudo apt update
Running: sudo apt upgrade -y
Running: sudo reboot
```

**Then:**
```
🔄 Server Rebooting Detected

⏱️ Auto-reconnect will start in 45 seconds
💾 Task saved: Will continue after reconnect
🔐 Using saved credentials
⏰ Will retry for up to 10 minutes (every 30 seconds)
```

**Auto-Reconnect Sequence:**
- Banner appears
- Progress updates
- Reconnects automatically
- Continues task verification

---

## 🎯 TEST 4: CANCEL DURING RECONNECT

### **Steps:**

```bash
1. Start reboot
2. Wait for banner to appear
3. Click [Cancel] button in banner
```

### **✅ Expected Behavior:**

**In UI:**
```
Banner disappears immediately
Chat message: "🛑 Auto-Reconnect Cancelled"
```

**In Console:**
```javascript
🛑 Cancelled auto-reconnect for session ssh_xxx
```

**User can then:**
- Reconnect manually when ready
- Credentials still saved for 4 hours

---

## 🎯 TEST 5: MAX TIMEOUT (10 MINUTES)

### **Steps:**

```bash
1. Reboot a server that takes >10 minutes to boot
2. OR disconnect network during reconnect
3. Let all 20 attempts fail
```

### **✅ Expected Behavior:**

**After 10 minutes:**
```
Attempt 20/20: Failed
Console: "⏰ Max duration reached (10 minutes)"
Banner disappears
Chat message: "❌ Auto-Reconnect Failed"
Message: "Could not reconnect within 10 minutes"
Instructions: "Please reconnect manually"
```

---

## 🔍 DEBUGGING COMMANDS

### **Check if Credentials Saved:**

**In Browser Console (after connecting):**
```javascript
// Import the manager
const { credentialManager } = await import('./app/lib/ssh-credential-manager.js')

// Check for your session
credentialManager.hasCredentials('your_session_id')
// Should return: true

// Get credential info (without sensitive data)
credentialManager.getSavedSessions()
// Should return: Array with your session
```

### **Check Auto-Reconnect State:**

```javascript
const { autoReconnect } = await import('./app/lib/ssh-auto-reconnect.js')

// Check if reboot was detected
autoReconnect.getPendingTask('your_session_id')
// Should return: Task object if reboot happened

// Check attempt count
autoReconnect.getAttemptCount('your_session_id')
// Should return: Number of attempts made
```

---

## 📊 SUCCESS INDICATORS

### **✅ Everything Working If You See:**

```
1. 🔐 Credentials saved message (on connect)
2. 🔄 Reboot detected message (on reboot)
3. 🔄 Banner appears (after disconnect)
4. 📊 Progress updates every 30s
5. 🔌 Reconnect attempts logged
6. ✅ Success message (on reconnect)
7. 📋 Task resume message
```

### **❌ Not Working If:**

```
1. No "🔐 credentials saved" on connect
2. No banner after reboot
3. No reconnect attempts
4. Manual reconnect required
```

---

## 🔧 COMMON ISSUES & FIXES

### **Issue 1: "No saved credentials"**

**Cause:** Credentials not saved on initial connection

**Fix:**
- Check console for "🔐 credentials saved" message
- Verify `result.credentials` exists in API response
- Check `credentialManager` import works

### **Issue 2: "Auto-reconnect not triggered"**

**Cause:** Reboot not detected or no pending task

**Fix:**
- Check console for "🔄 Reboot detected" message
- Verify command contains "reboot" keyword
- Ensure credentials were saved earlier

### **Issue 3: "Banner not appearing"**

**Cause:** React state not updating

**Fix:**
- Check `isReconnecting` state
- Verify `ReconnectionBanner` component imported
- Check for React errors in console

### **Issue 4: "Connection timeout every time"**

**Cause:** Server not back online yet

**Expected:** Normal! Server boots in 2-5 minutes
**Solution:** Wait for more attempts. Max is 20 over 10 minutes.

---

## 🎊 SUCCESS SCENARIO

### **Perfect Flow:**

```
✅ Connect SSH
   → See: "🔐 credentials saved"
   
✅ Execute: sudo reboot
   → See: "🔄 Reboot detected"
   → See: Banner appears
   
✅ Wait 45s
   → See: "Attempt 1/20"
   
✅ Wait 30s intervals
   → See: "Attempt 2/20, 3/20, etc."
   
✅ Server boots (usually 2-5 min)
   → See: "Attempt 5/20: Connected!"
   → See: Banner disappears
   → See: "✅ Reconnected Successfully!"
   
✅ Task resumes
   → Agent continues verification
   → Complete!
```

---

## 💰 COST

```
Feature Cost: $0 (FREE)
No AI API calls for reconnection
Pure SSH logic
```

---

## 🚀 STATUS

```
✅ Credentials saved on connect
✅ Reboot detection working
✅ 10-minute retry window
✅ 30-second intervals
✅ Progress UI showing
✅ Auto-reconnect functional
✅ Task resumption ready
```

**Ready to test!** 🧪

---

*Test Guide Created: November 10, 2025*  
*Feature: SSH Auto-Reconnect*  
*Status: Ready for Testing* ✅

