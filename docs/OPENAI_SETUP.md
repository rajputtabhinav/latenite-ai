# OpenAI API Setup Guide

## Quick Fix for GPT-4 Turbo

Your AI agent is now configured to use GPT-4 Turbo by default, but you need to set up your OpenAI API key.

## Step 1: Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

## Step 2: Add Credits to Your Account

**IMPORTANT:** You must have credits in your OpenAI account!

1. Go to: https://platform.openai.com/account/billing
2. Click "Add payment method"
3. Add at least $5-10 for testing

## Step 3: Configure Your .env.local File

1. In your project root folder (`C:\Users\asus\Desktop\Latenite.ai`), create or edit `.env.local`
2. Add this line:

```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

**Example:**
```bash
OPENAI_API_KEY=sk-proj-abc123xyz789...
```

3. Save the file

## Step 4: Restart Your Development Server

**CRITICAL:** You MUST restart the server for the environment variable to load!

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 5: Test It

1. Open your app
2. Send a message like "check memory use in our system"
3. It should now work with GPT-4 Turbo! ✅

## Troubleshooting

### Still Getting Errors?

**Check your .env.local file:**
```bash
# Should look like this:
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional for fallback
```

**Common Issues:**

1. **Extra spaces or quotes:** 
   - ❌ WRONG: `OPENAI_API_KEY = "sk-..."`
   - ✅ CORRECT: `OPENAI_API_KEY=sk-...`

2. **File location:**
   - Must be in project root: `C:\Users\asus\Desktop\Latenite.ai\.env.local`
   - NOT in any subfolder

3. **Didn't restart server:**
   - Environment variables only load on server start
   - Always restart after editing .env.local

4. **No credits in account:**
   - Check: https://platform.openai.com/account/billing
   - You need a positive balance

### Check if API Key is Working

Open your terminal and run:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

If it returns a list of models, your key is valid!

## What the Fix Does

1. **Line 2425:** Changed from hardcoded Claude to use your selected model
2. **Auto-switching:** If OpenAI fails, automatically tries Claude
3. **Better errors:** Shows which API failed and what to do

## Cost Information

**GPT-4 Turbo Pricing (as of 2024):**
- Input: ~$10 per 1M tokens
- Output: ~$30 per 1M tokens
- Typical message: $0.01 - $0.05

**Budget Recommendation:**
- Start with $5-10 for testing
- Set usage limits in OpenAI dashboard
- Monitor usage regularly

## Alternative: Use Both APIs

**Best Setup (Recommended):**
```bash
# In .env.local - configure BOTH for automatic failover
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

This way:
- If OpenAI fails → Auto-switches to Claude
- If Claude fails → Auto-switches to GPT-4
- You get maximum uptime!

## Support

If you still have issues:
1. Check the browser console for detailed error messages
2. Verify your API key at https://platform.openai.com/api-keys
3. Ensure you have credits at https://platform.openai.com/account/billing
4. Try the curl test command above

---

**Need help?** The error messages in the app now tell you exactly what's wrong and how to fix it!

