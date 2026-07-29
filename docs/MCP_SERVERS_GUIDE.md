# MCP Servers Guide - Latenite.ai Enhanced Productivity System

## Overview

Latenite.ai includes a **Model Context Protocol (MCP)** system with **5 working servers** that provide real-time access to documentation, web search, file operations, and more. All servers **auto-start** when the application loads for immediate availability.

## 🚀 Available MCP Servers

### **Documentation & Reference**
- **Context7 Documentation** - Up-to-date documentation for any library/framework
  - Tools: `resolve-library-id`, `get-library-docs`  
  - Usage: "React hooks documentation" or "Next.js routing setup"
  - **Auto-starts**: ✅ Automatically available when app loads

### **Web & Search**
- **Web Search & Scraping** - Search the web and scrape content
  - Tools: `web_search`, `scrape_page`, `get_page_content`
  - Usage: "web search for latest AI trends"
  - **Auto-starts**: ✅ Built-in functionality

### **Web Automation**
- **Advanced Web Automation** - Puppeteer-powered browser automation
  - Tools: `scrape_website`, `take_screenshot`, `extract_data`, `navigate_page`
  - Usage: "take screenshot of website" or "scrape data from page"
  - **Auto-starts**: ✅ Built-in functionality

### **Development Tools**
- **File System Operations** - File and directory management
  - Tools: `read_file`, `list_directory`, `search_files`
  - Usage: "read package.json" or "list files in directory"
  - **Auto-starts**: ✅ Built-in functionality

### **System Administration**
- **Terminal Operations** - Execute system commands
  - Tools: `execute_command`, `get_environment`
  - Usage: "run npm install" or "check system environment"
  - **Auto-starts**: ✅ Built-in functionality

## 🔧 How to Use

### 1. **Automatic Setup**
- All MCP servers **auto-start** when the application loads
- No manual configuration required
- Servers automatically restart if they fail

### 2. **Check Server Status**
- View server status in the AI agent settings
- All servers should show "running" status
- Health checks run automatically every 30 seconds

### 3. **Use in Conversations**
Simply ask natural questions - the system automatically routes to the appropriate server:

```
# Documentation (Context7)
"How do I use React hooks?"
"Next.js app router setup"
"TypeScript interfaces guide"

# Web Search
"What are the latest AI trends?"
"Search for Node.js best practices"

# File Operations
"Read my package.json file"
"List files in the src directory"
"Search for TypeScript files"

# Terminal Commands
"Run npm install"
"Check git status"
"What's my current directory?"

# Web Automation
"Take a screenshot of example.com"
"Extract data from that webpage"
```

## 📊 Server Architecture

### **Real MCP Server**
- **Context7 Documentation**: Uses actual MCP protocol with `npx @upstash/context7-mcp`

### **Built-in Implementations**
- **Web Search**: Custom implementation with web scraping
- **Web Automation**: Puppeteer-based automation
- **File System**: Security-restricted file operations
- **Terminal**: System command execution

## 🔒 Security & Permissions

- **File System**: Restricted to project directory
- **Terminal**: Basic commands only, no administrative access
- **Web Automation**: Safe browsing with timeout limits
- **Context7**: Public documentation access only

## 🚀 Auto-Start Features

### **Backend Auto-Start**
- All servers start automatically when MCP manager initializes
- Failed servers are automatically restarted
- Health checks every 30 seconds

### **Frontend Auto-Start**
- UI automatically starts all servers when app loads
- Server status polling every 5 seconds
- Automatic reconnection on failure

### **Robust Connection Management**
- JSON-RPC protocol for Context7 communication
- Fallback implementations for reliability
- Timeout handling and error recovery

## 🔧 Advanced Usage

### **Health Monitoring**
```javascript
// Check server health
GET /api/mcp?action=health

// Check specific server
GET /api/mcp?action=health&serverId=context7

// Manual health check all servers
GET /api/mcp?action=health-check-all
```

### **Server Management**
```javascript
// Restart a server
GET /api/mcp?action=restart&serverId=context7

// Get server status
GET /api/mcp?action=status

// Stop all servers
GET /api/mcp?action=stop-all
```

## 📈 Performance

- **Parallel Processing**: Multiple servers work simultaneously
- **Smart Routing**: AI automatically selects appropriate tools
- **Efficient Health Checks**: Minimal overhead monitoring
- **Auto-Recovery**: Failed servers restart automatically

## 🎯 Context7 Integration

### **Library Resolution**
The system automatically resolves library names to Context7 IDs:
- `react` → `/facebook/react`
- `next.js` → `/vercel/next.js`
- `typescript` → `/microsoft/TypeScript`
- And many more...

### **Documentation Fetching**
- Fetches up-to-date documentation
- Provides code examples and best practices
- Supports 8000+ token responses
- Fallback to web scraping if needed

### **Usage Examples**
```
"How do I use Clerk authentication?"
"Next.js 14 app router features"
"React Server Components guide"
"TypeScript generic constraints"
```

## 🔧 Technical Implementation

- **Next.js Integration**: Built into your existing app
- **TypeScript Support**: Full type safety throughout
- **Error Handling**: Comprehensive fallback mechanisms
- **Windows Compatibility**: Cross-platform command execution
- **Real-time Status**: Live server monitoring and health checks

This streamlined MCP system provides reliable, auto-starting servers with honest capabilities and robust error handling for maximum productivity. 