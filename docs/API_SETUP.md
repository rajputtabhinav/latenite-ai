# Latenite AI - API Configuration Guide

## Overview
Latenite AI requires API keys from AI providers to function. This guide will help you set up and troubleshoot API configurations.

## Quick Start

### 1. Create Environment File
Create a file named `.env.local` in the root directory of the project.

### 2. Add Your API Keys
```bash
# Anthropic Claude API (Recommended - Best performance)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI API (Optional - Provides GPT-4 and O1 models)
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
```

## Getting API Keys

### Anthropic Claude (Recommended)
1. Visit: https://console.anthropic.com/settings/keys
2. Create a new API key
3. **Add credits**: https://console.anthropic.com/settings/plans
   - Claude Sonnet 4.5 offers 1M context window
   - Best for complex coding tasks

### OpenAI
1. Visit: https://platform.openai.com/api-keys
2. Create a new API key
3. **Add credits**: https://platform.openai.com/account/billing
   - GPT-4o: Fast and multimodal
   - O1: Advanced reasoning capabilities

### Google Gemini
1. Visit: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Manage billing: https://console.cloud.google.com/billing

## Troubleshooting

### Error: "Credit balance is too low"

**This error occurs when:**
- Your API account doesn't have sufficient credits
- Your API key is invalid or expired
- You've exceeded your usage quota

**Solutions:**

1. **Add Credits to Your Account**
   - Anthropic: https://console.anthropic.com/settings/plans
   - OpenAI: https://platform.openai.com/account/billing

2. **Verify Your API Key**
   - Check that your `.env.local` file has the correct key
   - Ensure there are no extra spaces or quotes
   - Format: `ANTHROPIC_API_KEY=sk-ant-xxxxx`

3. **Switch to a Different Model**
   - Click the model selector in the AI Agent
   - Try OpenAI models if you have OpenAI credits
   - The app will automatically suggest alternatives

4. **Check API Status**
   - Anthropic Status: https://status.anthropic.com/
   - OpenAI Status: https://status.openai.com/

### Error: "API key not configured"

**Solutions:**
- Ensure `.env.local` file exists in project root
- Check environment variable names are correct
- Restart the development server after adding keys
- Verify the API key format is correct

## Multiple Providers Setup

**Recommended:** Configure multiple API providers for automatic fallback.

```bash
# Configure both Anthropic and OpenAI
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
```

**Benefits:**
- Automatic failover if one provider has issues
- Access to different model capabilities
- Cost optimization by using different models

## Model Selection Guide

### When to Use Each Model:

**Claude Sonnet 4.5** (Anthropic)
- ✅ Complex coding tasks
- ✅ Large codebases (1M context)
- ✅ Terminal automation
- ✅ Multi-step reasoning

**GPT-4o** (OpenAI)
- ✅ Fast responses
- ✅ Multimodal tasks
- ✅ General development

**O1/O1-Mini** (OpenAI)
- ✅ Advanced reasoning
- ✅ Complex problem solving
- ✅ Mathematical tasks

## Security Best Practices

1. **Never commit API keys to Git**
   - `.env.local` is automatically ignored
   - Use `.env.example` for documentation

2. **Rotate keys regularly**
   - Change API keys periodically
   - Revoke unused keys

3. **Set spending limits**
   - Configure usage limits in API dashboards
   - Monitor usage regularly

4. **Use separate keys for development/production**
   - Different keys for different environments
   - Easier to track and revoke

## Cost Management

### Estimated Costs (as of 2025)

**Anthropic Claude Sonnet 4:**
- Input: $3 per million tokens
- Output: $15 per million tokens

**OpenAI GPT-4o:**
- Input: $2.50 per million tokens
- Output: $10 per million tokens

**Tips to Reduce Costs:**
- Use appropriate models for tasks
- Monitor usage in API dashboards
- Set spending limits
- Use caching when available

## Support

If you continue to experience issues:
1. Check the browser console for detailed error messages
2. Verify API provider status pages
3. Review your API account billing status
4. Contact API provider support:
   - Anthropic: support@anthropic.com
   - OpenAI: https://help.openai.com/

## Updates

This guide is maintained for Latenite AI. For the latest API information, always refer to the official provider documentation.

Last updated: November 2025

