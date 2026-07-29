# 🔧 API Setup & Troubleshooting

## ⚠️ Error Explanation

The error you're seeing is from **Cursor IDE itself** (not your application):
```
ERROR_OPENAI - Unable to reach the model provider
```

**Stack trace shows:** `vscode-file://vscode-app/` = Cursor IDE internal

This happens when:
1. Cursor IDE is trying to use AI features (autocomplete, chat)
2. It can't reach OpenAI's API

**This is NOT related to our Claude Sonnet 4.5 upgrade!**

---

## ✅ Solution: Check Your API Keys

### 1. Create `.env` File (Application)

In your project root, create a `.env` file:

```bash
# Required for Claude Sonnet 4.5
ANTHROPIC_API_KEY=sk-ant-api03-REDACTED-ROTATE-THIS-KEY

# Optional (for Cursor IDE features)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server
PORT=5000
NODE_ENV=development
```

### 2. Get Anthropic API Key

1. Go to: https://console.anthropic.com/
2. Sign up / Log in
3. Go to **API Keys** section
4. Create new key
5. Copy and paste into `.env`

### 3. Fix Cursor IDE Error (Optional)

The error is from Cursor IDE, not your app. To fix:

**Option A: Add OpenAI Key to Cursor**
1. Open Cursor Settings (Ctrl+,)
2. Search for "API Key"
3. Add your OpenAI API key

**Option B: Disable Cursor AI Features**
1. Open Cursor Settings
2. Search for "AI"
3. Disable autocomplete/chat if you don't use them

**Option C: Ignore It**
- The error doesn't affect your application
- Your app uses Anthropic API (Claude), not OpenAI

---

## 🧪 Test Your Application

### 1. Check API Key is Loaded

Add this to `server.js` temporarily (line 10):

```javascript
console.log('🔑 Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? '✅ Loaded' : '❌ Missing')
```

### 2. Start Your Server

```bash
npm run dev
```

**Expected output:**
```
🔑 Anthropic API Key: ✅ Loaded
✅ Next.js + Socket.io server ready on http://localhost:5000
🔌 WebSocket server ready for SSH connections with enhanced agent sync
```

### 3. Test Claude Sonnet 4.5

1. Open http://localhost:5000
2. Connect to SSH
3. Open AI Agent (right side panel)
4. Send a message
5. Should see: "Claude Sonnet 4.5" in model selector

**Console should show:**
```
🤖 AI chat request via WebSocket: claude-sonnet-4-5
📤 Streaming response...
```

---

## 🐛 Common Issues

### Issue 1: "Anthropic API key not configured"

**Cause:** `.env` file missing or not loaded

**Fix:**
```bash
# Create .env file
echo ANTHROPIC_API_KEY=your_key_here > .env

# Restart server
npm run dev
```

### Issue 2: "beta.messages is not a function"

**Cause:** Old @anthropic-ai/sdk version

**Fix:**
```bash
npm install @anthropic-ai/sdk@latest
npm run dev
```

### Issue 3: "context-1m-2025-08-07 beta not available"

**Cause:** API key doesn't have access to 1M context beta

**Possible reasons:**
- Free tier (upgrade to paid)
- New account (wait for access)
- Need to request beta access

**Temporary fix:**
Remove beta flag in `server.js` line 375:
```javascript
// Remove this line temporarily:
betas: ['context-1m-2025-08-07']
```

**Result:** Will use 200K context instead of 1M (still works!)

---

## 📋 Environment Setup Checklist

### Required:
- ✅ `.env` file exists in project root
- ✅ `ANTHROPIC_API_KEY` is set
- ✅ `@anthropic-ai/sdk` version 0.55.0 or higher
- ✅ Node.js version 16 or higher

### Optional:
- ⬜ `OPENAI_API_KEY` (only for Cursor IDE features)
- ⬜ Anthropic paid account (for 1M context beta)

---

## 🔍 Verify Installation

Run this command:

```bash
node -e "console.log('Anthropic SDK:', require('@anthropic-ai/sdk/package.json').version)"
```

**Expected:** `Anthropic SDK: 0.55.0` or higher

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Create .env file
# (manually create it with your API key)

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:5000

# 5. Connect SSH and test AI Agent
```

---

## 📞 Still Having Issues?

### Check Logs:

**Server Console:**
- Look for "🤖 AI chat request"
- Look for "❌ AI streaming error"

**Browser Console (F12):**
- Look for WebSocket connection errors
- Look for "🤖 Agent received enhanced output"

### Common Log Messages:

**✅ Good:**
```
🤖 AI chat request via WebSocket: claude-sonnet-4-5
📤 SSH output: ...
🤖 Agent received enhanced output: { length: 123 }
```

**❌ Bad:**
```
❌ AI streaming error: Anthropic API key not configured
❌ Failed to create AI client
ERROR: beta.messages is not a function
```

---

## 🎯 Summary

**Your Cursor IDE error is separate from your application!**

To fix your application:
1. Create `.env` file
2. Add `ANTHROPIC_API_KEY=your_key`
3. Restart server
4. Test Claude Sonnet 4.5

To fix Cursor IDE:
- Add OpenAI key to Cursor settings
- OR ignore it (doesn't affect your app)

---

**Need Help?** Check the logs and match them against the examples above.

