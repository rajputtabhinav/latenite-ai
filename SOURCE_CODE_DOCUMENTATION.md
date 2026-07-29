# Latenite.ai - Complete Source Code Documentation

**Generated:** February 9, 2026  
**Total Files:** 62,025 (including dependencies)  
**Source Code Files:** ~137 TypeScript/JavaScript/Python files

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [API Routes](#api-routes)
5. [Components](#components)
6. [Libraries & Utilities](#libraries--utilities)
7. [Types & Interfaces](#types--interfaces)
8. [Configuration Files](#configuration-files)

---

## 🎯 Project Overview

**Latenite.ai** is an AI-powered terminal intelligence platform that provides advanced terminal capabilities with integrated AI assistance. The application combines:

- **Real SSH connections** to remote servers
- **AI-powered code assistance** using Claude Sonnet 4.5 (Anthropic)
- **MCP (Model Context Protocol)** server integration
- **Real-time terminal** with WebSocket communication
- **Advanced web automation** (Puppeteer & Playwright)
- **Semantic code search** with vector embeddings
- **Persistent memory** and conversation history

---

## 🛠 Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **XTerm.js** - Terminal emulator

### Backend
- **Node.js** - Runtime environment
- **Socket.io** - Real-time WebSocket communication
- **SSH2** - SSH protocol implementation
- **Anthropic SDK** - AI integration (Claude Sonnet 4.5)

### AI & Intelligence
- **Claude Sonnet 4.5** - 1M context window, 64K max output tokens
- **Qdrant** - Vector database for semantic search
- **Context7** - Documentation retrieval
- **Prompt caching** - Cost optimization

### Automation & Tools
- **Puppeteer** - Headless browser automation
- **Playwright** - Cross-browser testing
- **MCP Servers** - Modular capability protocol

---

## 📁 Project Structure

```
Latenite.ai/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── agent/               # Agent execution
│   │   ├── ai/                  # AI chat & streaming
│   │   ├── ssh/                 # SSH connections
│   │   ├── mcp/                 # MCP server management
│   │   ├── playwright/          # Browser automation
│   │   └── embeddings/          # Code embeddings
│   ├── components/              # React components
│   │   └── AIAgent/            # AI agent UI
│   ├── lib/                     # Utility libraries
│   ├── types/                   # TypeScript types
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── server.js                     # Custom Next.js server with Socket.io
├── package.json                  # Dependencies
└── next.config.js               # Next.js configuration
```

---

## 🔌 API Routes

### Agent Execution

#### `app/api/agent/execute/route.ts`
**Purpose:** Execute agent commands with multiple execution modes (SSH/System/Manual)

**Key Features:**
- Multi-mode command execution (SSH, system, manual fallback)
- Session management integration
- Command explanation and safety checks
- Real-time execution status

**Endpoints:**
- `POST /api/agent/execute` - Execute agent command
- `GET /api/agent/execute` - Get execution endpoint info

**Code Summary:**
```typescript
interface AgentExecuteRequest {
  command: string
  explanation: string
  sessionId?: string
  executionMode: 'ssh' | 'manual' | 'system'
  userConfirmation?: boolean
}
```

**Execution Modes:**
1. **SSH Mode:** Execute on remote server via SSH session
2. **System Mode:** Execute on local system
3. **Manual Mode:** Propose command for user to execute manually

---

### AI Chat System

#### `app/api/ai/chat/route.ts`
**Purpose:** Main AI chat endpoint using Claude Sonnet 4.5 with Anthropic SDK

**Key Features:**
- **Claude Sonnet 4.5 integration** (1M context, 64K output)
- **Prompt caching** for 90% cost savings
- **Context7 documentation** auto-fetching
- **Terminal context** integration
- **Response caching** for repeated queries
- **Multi-model routing** support

**Request Format:**
```typescript
{
  messages: Message[],
  model?: string,
  terminalContext?: string[],
  autoRouteModel?: boolean
}
```

**Response Format:**
```typescript
{
  success: boolean
  message: string
  hasCode: boolean
  provider: 'anthropic'
  model: 'Claude Sonnet 4.5'
  cached: boolean
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_creation_tokens: number
  }
}
```

**Caching Strategy:**
- System prompt caching (Anthropic ephemeral cache)
- Response caching (in-memory)
- Cache hit = 90% cost savings

---

#### `app/api/ai/stream/route.ts`
**Purpose:** Streaming AI responses for real-time interaction

**Key Features:**
- Server-sent events (SSE)
- Incremental response streaming
- Progress updates
- Error handling mid-stream

---

#### `app/api/ai/analyze-session/route.ts`
**Purpose:** Analyze terminal sessions and provide insights

**Key Features:**
- Session summary generation
- Command pattern analysis
- Error detection and suggestions
- Performance metrics

---

#### `app/api/ai/cursor/route.ts`
**Purpose:** Cursor-like AI features for code editing

**Key Features:**
- Inline code suggestions
- Code completion
- Refactoring suggestions
- Context-aware editing

---

### SSH Management

#### `app/api/ssh/connect/route.ts`
**Purpose:** Establish SSH connections with robust error handling and retry logic

**Key Features:**
- **Password and SSH key authentication**
- **SSH key validation** (RSA, DSA, EC, OpenSSH formats)
- **Automatic retry logic** (3 attempts with progressive delays)
- **Algorithm fallback** for compatibility
- **Keep-alive management** (30s interval, 10 max failures)
- **Enhanced diagnostics**
- **Auto-reconnect credentials** storage

**Connection Configuration:**
```typescript
interface SSHConnectionConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
  keepaliveInterval: 30000  // 30 seconds
  keepaliveCountMax: 10     // 5 minutes total
  readyTimeout: 30000       // 30 second timeout
}
```

**Retry Strategy:**
- Initial attempt with modern algorithms
- Fallback attempt with legacy algorithms
- Progressive delay: 2s, 4s, 6s
- Max 3 retries for recoverable errors

**Error Handling:**
- ENOTFOUND: Host not found
- ECONNREFUSED: Connection refused (retry)
- ETIMEDOUT: Connection timeout (retry)
- Authentication: Auth failures (no retry)
- EPIPE: Broken pipe (retry)

---

#### `app/api/ssh/terminal/route.ts`
**Purpose:** SSH terminal command execution and output handling

**Key Features:**
- Command execution over SSH
- Real-time output streaming
- Session state management
- Command history tracking

---

#### `app/api/ssh/disconnect/route.ts`
**Purpose:** Gracefully disconnect SSH sessions

**Key Features:**
- Clean session termination
- Resource cleanup
- Notification to connected clients

---

#### `app/api/ssh/diagnostics/route.ts`
**Purpose:** SSH connection diagnostics and troubleshooting

**Key Features:**
- Connection health checks
- Network diagnostics
- Performance metrics
- Error analysis

---

#### `app/api/ssh/health/route.ts`
**Purpose:** SSH session health monitoring

**Key Features:**
- Active session tracking
- Connection status checks
- Session timeout detection

---

### MCP (Model Context Protocol)

#### `app/api/mcp/route.ts`
**Purpose:** Manage MCP servers and tool invocations

**Key Features:**
- **Auto-start MCP servers** on initialization
- **Built-in services:** Web search, filesystem, terminal, Puppeteer, Playwright
- **Real MCP servers:** Context7 documentation
- **Tool invocation** with error handling
- **Health checks** (every 2 minutes)
- **Server restart** on failures

**Integrated MCP Servers:**

1. **Context7 Documentation**
   - Library documentation retrieval
   - Up-to-date API references
   - Tools: `resolve-library-id`, `get-library-docs`

2. **Web Search & Scraping**
   - DuckDuckGo search
   - Basic page scraping
   - Tools: `web_search`, `scrape_page`, `get_page_content`

3. **Puppeteer (Advanced Automation)**
   - Headless browser control
   - Screenshot capture
   - Data extraction
   - Tools: `scrape_website`, `take_screenshot`, `extract_data`

4. **Playwright (Cross-browser)**
   - Chrome, Firefox, Safari support
   - Form filling, screenshots, PDFs
   - Network monitoring
   - Tools: `navigate`, `extract_data`, `fill_form`, `take_screenshot`, `generate_pdf`

5. **Filesystem Operations**
   - Read/write files (security-restricted)
   - Directory operations
   - File search
   - Tools: `read_file`, `list_directory`, `search_files`

6. **Terminal Operations**
   - Command execution (security-restricted)
   - Environment inspection
   - Tools: `execute_command`, `get_environment`

**API Endpoints:**
- `GET /api/mcp?action=status` - Get server statuses
- `GET /api/mcp?action=start&serverId=X` - Start specific server
- `GET /api/mcp?action=health` - Health check all servers
- `POST /api/mcp` - Invoke MCP tool

**MCP Server Manager:**
```typescript
class MCPServerManager {
  private serverConfigs: Map<string, MCPServerConfig>
  private serverStatuses: Map<string, boolean>
  private runningProcesses: Map<string, ChildProcess>
  
  // Auto-start on initialization
  // Periodic health checks
  // Automatic restart on failure
}
```

---

### Context & Memory

#### `app/api/context/build/route.ts`
**Purpose:** Build contextual information for AI queries

**Key Features:**
- Codebase context extraction
- Terminal history integration
- Documentation retrieval
- Relevant file identification

---

#### `app/api/memory/query/route.ts`
**Purpose:** Query persistent memory for past interactions

**Key Features:**
- Conversation history search
- Similar decision retrieval
- Pattern recognition
- Learning from past interactions

---

### Embeddings & Search

#### `app/api/embeddings/index/route.ts`
**Purpose:** Index codebase for semantic search

**Key Features:**
- Code file indexing
- Vector embedding generation
- Qdrant integration
- Incremental updates

---

### Automation

#### `app/api/playwright/route.ts`
**Purpose:** Playwright browser automation endpoint

**Key Features:**
- Page navigation
- Form filling
- Screenshot/PDF generation
- Network monitoring
- Responsive testing

---

### File Operations

#### `app/api/files/read/route.ts`
**Purpose:** Read and process uploaded files

**Key Features:**
- File upload handling
- Excel (.xlsx) parsing
- PDF text extraction
- Document (.docx) processing
- Base64 encoding

---

### System Monitoring

#### `app/api/health/route.ts`
**Purpose:** Application health check endpoint

**Key Features:**
- Service status checks
- Dependency verification
- Performance metrics
- System diagnostics

---

#### `app/api/system/execute/route.ts`
**Purpose:** Execute system commands on local machine

**Key Features:**
- Local command execution
- Output capture
- Error handling
- Security restrictions

---

### Utilities

#### `app/api/prompt-builder/route.ts`
**Purpose:** Build optimized prompts for AI models

**Key Features:**
- Template management
- Context injection
- Token counting
- Prompt optimization

---

#### `app/api/prompt-builder/builder.py`
**Purpose:** Python-based prompt builder with advanced features

**Key Features:**
- Complex prompt generation
- Multi-language support
- Template engine integration

---

#### `app/api/xlsx/process/route.ts`
**Purpose:** Process Excel files and extract data

**Key Features:**
- Multi-sheet parsing
- Data validation
- Format conversion
- Cell value extraction

---

## 🧩 Components

### Core UI Components

#### `app/page.tsx`
**Purpose:** Landing page component

**Renders:**
- Header
- Hero section
- Features showcase
- Product overview
- Intelligence highlights
- Experience demonstration
- Testimonials
- Newsletter signup
- Footer

---

#### `app/layout.tsx`
**Purpose:** Root layout component

**Metadata:**
- Title: "Latenite.ai - AI-Powered Terminal Intelligence"
- Description: Next-gen AI terminal platform
- Inter font loading

**Configuration:**
- Dynamic rendering enabled
- Dynamic params enabled

---

### AI Agent System

#### `app/components/AIAgent.tsx`
**Purpose:** Main AI Agent interface component

**Key Features:**
- **Message management** with persistent storage
- **Multiple execution hooks:**
  - `useAgentState` - UI and settings state
  - `useAgentSocket` - Socket connection management
  - `useAgentExecution` - Command execution
  - `useAgentMCP` - MCP tool integration
  - `useMessageStore` - Message persistence
  
- **Terminal integration:**
  - TerminalAgentController
  - Command queue management
  - Output synchronization

**Props:**
```typescript
interface AIAgentProps {
  isOpen: boolean
  onToggle: () => void
  terminalOutput?: string[]
  onCodeInsert?: (code: string) => void
  sshSocket?: Socket | null
  sessionId?: string
  onCommandPropose?: (command: string, explanation: string) => Promise<void>
  terminalState?: TerminalState
  bridgeStatus?: AgentBridgeStatus
  queueStats?: CommandQueueStats
}
```

**Features:**
- Resizable panel with drag handle
- Message persistence (IndexedDB)
- Command execution tracking
- MCP server integration
- File upload support
- Settings management

---

#### `app/components/AIAgent/AgentHeader.tsx`
**Purpose:** Agent header with controls

**Features:**
- Model selector
- Settings toggle
- Connection status
- Command counter

---

#### `app/components/AIAgent/AgentSettings.tsx`
**Purpose:** Agent configuration panel

**Settings:**
- Model selection
- Temperature control
- Max tokens
- MCP server management
- Auto-documentation toggle

---

#### `app/components/AIAgent/ui/AgentChatArea.tsx`
**Purpose:** Chat message display area

**Features:**
- Message rendering
- Code block highlighting
- Markdown support
- Typing indicators
- Auto-scroll

---

#### `app/components/AIAgent/ui/AgentInputArea.tsx`
**Purpose:** Message input interface

**Features:**
- Multi-line input
- File attachment
- Command shortcuts
- Send button with hotkey

---

#### `app/components/AIAgent/MessageRenderer.tsx`
**Purpose:** Render individual AI messages

**Features:**
- Markdown parsing
- Code syntax highlighting
- Command execution proposals
- Thinking process display
- Timeline visualization

---

#### `app/components/AIAgent/TaskTimeline.tsx`
**Purpose:** Visual timeline of agent tasks

**Features:**
- Task progress visualization
- Step-by-step breakdown
- Duration tracking
- Success/failure indicators

---

### Terminal Components

#### `app/components/XTermTerminal.tsx`
**Purpose:** XTerm.js terminal component

**Features:**
- Terminal emulation
- SSH connection handling
- Command history
- Copy/paste support
- Search functionality

---

#### `app/components/EnhancedXTermTerminal.tsx`
**Purpose:** Enhanced terminal with AI integration

**Features:**
- AI command suggestions
- Smart autocomplete
- Context-aware help
- Performance optimizations

---

#### `app/components/ProfessionalTerminal.tsx`
**Purpose:** Professional-grade terminal interface

**Features:**
- Multiple session support
- Split panes
- Advanced shortcuts
- Custom themes

---

#### `app/components/FullscreenTerminal.tsx`
**Purpose:** Fullscreen terminal mode

**Features:**
- Distraction-free interface
- Keyboard shortcuts
- Quick access toolbar

---

#### `app/components/TerminalTabs.tsx`
**Purpose:** Multiple terminal tab management

**Features:**
- Tab switching
- Tab creation/closing
- Session persistence
- Visual indicators

---

### Modal & Overlay Components

#### `app/components/SSHConnectionModal.tsx`
**Purpose:** SSH connection configuration dialog

**Features:**
- Host/username input
- Password/key authentication toggle
- SSH key upload
- Passphrase support
- Recent connections history

---

#### `app/components/SessionChoiceModal.tsx`
**Purpose:** Session selection dialog

**Features:**
- Active session list
- New session creation
- Session resume
- Session details

---

#### `app/components/DocumentPreviewModal.tsx`
**Purpose:** Document preview overlay

**Features:**
- File preview
- Syntax highlighting
- Image display
- PDF rendering

---

#### `app/components/FileUploadPreview.tsx`
**Purpose:** File upload preview interface

**Features:**
- Drag-and-drop upload
- File type detection
- Preview generation
- Multiple file support

---

### UI Enhancement Components

#### `app/components/SmartSuggestions.tsx`
**Purpose:** AI-powered command suggestions

**Features:**
- Context-aware suggestions
- Command completion
- Error correction
- Learning from history

---

#### `app/components/InlineCodeSuggestion.tsx`
**Purpose:** Inline code completion

**Features:**
- Real-time suggestions
- Tab completion
- Syntax awareness

---

#### `app/components/CommandHistory.tsx`
**Purpose:** Command history panel

**Features:**
- Searchable history
- Quick re-execution
- Favorites
- Statistics

---

#### `app/components/CommandProgressIndicator.tsx`
**Purpose:** Command execution progress display

**Features:**
- Progress bars
- Status updates
- Time estimates
- Cancellation support

---

#### `app/components/TerminalCommandProposal.tsx`
**Purpose:** AI command proposal display

**Features:**
- Command preview
- Explanation
- Accept/reject actions
- Modification support

---

#### `app/components/TerminalClickableIndicator.tsx`
**Purpose:** Clickable elements in terminal output

**Features:**
- File path detection
- URL linking
- Command extraction

---

### Landing Page Components

#### `app/components/Header.tsx`
**Purpose:** Site header/navigation

**Features:**
- Logo
- Navigation menu
- CTA buttons

---

#### `app/components/Hero.tsx`
**Purpose:** Hero section

**Features:**
- Headline
- Subheadline
- Primary CTA
- Visual elements

---

#### `app/components/Features.tsx`
**Purpose:** Features showcase

**Features:**
- Feature grid
- Icons
- Descriptions
- Benefits

---

#### `app/components/ProductOverview.tsx`
**Purpose:** Product overview section

**Features:**
- Product highlights
- Screenshots
- Use cases

---

#### `app/components/Intelligence.tsx`
**Purpose:** AI intelligence showcase

**Features:**
- AI capabilities
- Examples
- Technical details

---

#### `app/components/Experience.tsx`
**Purpose:** User experience section

**Features:**
- UX highlights
- Workflow demonstrations

---

#### `app/components/Testimonials.tsx`
**Purpose:** User testimonials

**Features:**
- Customer quotes
- Ratings
- Social proof

---

#### `app/components/Newsletter.tsx`
**Purpose:** Newsletter signup

**Features:**
- Email input
- Subscribe button
- Privacy notice

---

#### `app/components/Footer.tsx`
**Purpose:** Site footer

**Features:**
- Links
- Social media
- Copyright

---

### Utility Components

#### `app/components/LoadingSpinner.tsx`
**Purpose:** Loading indicator

**Features:**
- Animated spinner
- Customizable size/color

---

#### `app/components/ErrorBoundary.tsx`
**Purpose:** React error boundary

**Features:**
- Error catching
- Error display
- Recovery options

---

#### `app/components/ReconnectionBanner.tsx`
**Purpose:** Connection lost banner

**Features:**
- Reconnection status
- Retry button
- Countdown timer

---

#### `app/components/MCPToggle.tsx`
**Purpose:** MCP server toggle control

**Features:**
- Server on/off switch
- Status indicator
- Error messages

---

#### `app/components/SSHHistory.tsx`
**Purpose:** SSH connection history

**Features:**
- Recent connections
- Quick reconnect
- Connection details

---

#### `app/components/AgentMemory.tsx`
**Purpose:** Agent memory visualization

**Features:**
- Memory state display
- Conversation history
- Decision log

---

### Agent Sub-Components

#### `app/components/AIAgent/components/CommandExecution.tsx`
**Purpose:** Command execution display

---

#### `app/components/AIAgent/components/LiveProgress.tsx`
**Purpose:** Live progress visualization

---

#### `app/components/AIAgent/components/TaskResult.tsx`
**Purpose:** Task result display

---

#### `app/components/AIAgent/components/ThinkingProcess.tsx`
**Purpose:** AI thinking process visualization

---

#### `app/components/AIAgent/AgentMessageNew.tsx`
**Purpose:** Enhanced message rendering

---

#### `app/components/AIAgent/DocumentationIndicator.tsx`
**Purpose:** Auto-fetched documentation indicator

---

#### `app/components/AIAgent/EnhancedStatusBar.tsx`
**Purpose:** Enhanced agent status bar

---

#### `app/components/AIAgent/LongRunningTaskPanel.tsx`
**Purpose:** Long-running task management panel

---

#### `app/components/AIAgent/MessageList.tsx`
**Purpose:** Optimized message list rendering

---

#### `app/components/AIAgent/TerminalStatusPanel.tsx`
**Purpose:** Terminal status display

---

## 📚 Libraries & Utilities

### AI & Intelligence

#### `app/lib/agent-intelligence.ts`
**Purpose:** Core AI intelligence layer

**Key Functions:**
```typescript
// Enhance query with code context
async function enhanceQueryWithCodeContext(
  userQuery: string,
  terminalHistory: string[]
): Promise<{ enhancedQuery: string; context: AgentContext }>

// Save conversation
async function persistConversation(
  sessionId: string,
  messages: any[],
  metadata?: Record<string, any>
): Promise<void>

// Restore conversation
async function restoreConversation(sessionId: string): Promise<any[] | null>

// Save decision
async function saveAgentDecision(
  task: string,
  decision: string,
  success: boolean,
  metadata?: any
): Promise<void>
```

**Features:**
- Semantic code search integration
- Persistent memory integration
- Context building
- Decision logging

---

#### `app/lib/multi-model-router.ts`
**Purpose:** Route requests to appropriate AI models

**Features:**
- Model selection logic
- Cost optimization
- Capability matching
- Fallback handling

---

#### `app/lib/multi-model-orchestrator.ts`
**Purpose:** Orchestrate multiple AI model calls

**Features:**
- Parallel execution
- Result aggregation
- Consensus building

---

#### `app/lib/agent-cache.ts`
**Purpose:** AI response caching system

**Features:**
- In-memory cache
- Prompt caching
- Response caching
- Cache statistics

**Cache Types:**
1. **Prompt Cache:** Reusable system prompts
2. **Response Cache:** Full AI responses
3. **Context Cache:** Code/terminal context

**Benefits:**
- 90% cost reduction on cache hits
- Faster response times
- Reduced API calls

---

#### `app/lib/agent-context-enhancer.ts`
**Purpose:** Enhance AI context with relevant information

**Features:**
- Code snippet extraction
- Documentation integration
- Terminal history formatting

---

#### `app/lib/agent-documentation-helper.ts`
**Purpose:** Automatic documentation fetching

**Features:**
- Library detection
- Documentation retrieval
- Context7 integration
- Caching

---

#### `app/lib/auto-documentation-fetcher.ts`
**Purpose:** Proactive documentation fetching

**Features:**
- Keyword detection
- Automatic API lookup
- Documentation caching

---

### Embeddings & Search

#### `app/lib/embeddings/code-embeddings.ts`
**Purpose:** Generate embeddings for code files

**Features:**
- OpenAI embedding API
- Batch processing
- Vector generation

---

#### `app/lib/embeddings/codebase-indexer.ts`
**Purpose:** Index entire codebase for search

**Features:**
- File traversal
- Incremental indexing
- Qdrant storage

---

#### `app/lib/embeddings/semantic-search.ts`
**Purpose:** Semantic code search engine

**Key Functions:**
```typescript
// Find relevant code for query
async function findRelevantCodeForQuery(
  query: string,
  topK: number = 10
): Promise<SearchResult[]>

// Build code context from results
function buildCodeContext(results: SearchResult[]): string
```

**Features:**
- Vector similarity search
- Relevance scoring
- Context building

---

#### `app/lib/embeddings/vector-store.ts`
**Purpose:** Vector database management

**Features:**
- Qdrant client wrapper
- Collection management
- Vector CRUD operations

---

### Memory & Persistence

#### `app/lib/memory/persistent-memory.ts`
**Purpose:** Persistent conversation and decision storage

**Key Functions:**
```typescript
// Save conversation
async function saveConversation(
  sessionId: string,
  messages: any[],
  metadata?: any
): Promise<void>

// Load conversation
async function loadConversation(sessionId: string): Promise<any[] | null>

// Save decision
async function saveDecision(
  task: string,
  decision: string,
  success: boolean,
  metadata?: any
): Promise<void>

// Get similar decisions
async function getSimilarDecisions(
  query: string,
  topK: number = 5
): Promise<any[]>
```

**Storage Locations:**
- Conversations: `./data/conversations/`
- Decisions: `./data/decisions/`

---

#### `app/lib/conversation-memory.ts`
**Purpose:** In-memory conversation management

**Features:**
- Short-term memory
- Context window management
- Message summarization

---

#### `app/lib/session-persistence.ts`
**Purpose:** Session state persistence

**Features:**
- LocalStorage integration
- Session restoration
- State serialization

---

### SSH Management

#### `app/lib/ssh-session-manager.ts`
**Purpose:** Centralized SSH session management

**Key Functions:**
```typescript
function storeSession(sessionId: string, session: SSHSession): void
function getSession(sessionId: string): SSHSession | null
function cleanupSession(sessionId: string): void
function getAllSessions(): Map<string, SSHSession>
function getSessionsByType(): { total: number; real: number }
```

**Features:**
- Global session registry
- Session lifecycle management
- Auto-cleanup on timeout
- Connection pooling

---

#### `app/lib/ssh-connection-handler.ts`
**Purpose:** SSH connection establishment and management

**Features:**
- Connection creation
- Authentication handling
- Error recovery

---

#### `app/lib/ssh-credential-manager.ts`
**Purpose:** Secure credential storage and retrieval

**Features:**
- Encrypted storage
- Key management
- Passphrase handling

---

#### `app/lib/ssh-diagnostics.ts`
**Purpose:** SSH connection diagnostics

**Features:**
- Connection testing
- Performance monitoring
- Issue detection

---

#### `app/lib/ssh-auto-reconnect.ts`
**Purpose:** Automatic SSH reconnection

**Features:**
- Connection monitoring
- Automatic retry
- State restoration

---

### Terminal

#### `app/lib/terminal-agent-integration.ts`
**Purpose:** Bridge between terminal and AI agent

**Class:** `TerminalAgentController`

**Features:**
- Command queue management
- Output synchronization
- Agent-terminal communication

---

#### `app/lib/terminal-session-tracker.ts`
**Purpose:** Track terminal session metrics

**Features:**
- Command logging
- Performance tracking
- Usage statistics

---

#### `app/lib/terminal-document-generator.ts`
**Purpose:** Generate documentation from terminal sessions

**Features:**
- Session report generation
- Command history formatting
- Markdown export

---

#### `app/lib/shared-terminal-state.ts`
**Purpose:** Shared terminal state management

**Features:**
- Global state
- State synchronization
- Event broadcasting

---

#### `app/lib/multi-terminal-manager.ts`
**Purpose:** Manage multiple terminal instances

**Features:**
- Terminal creation
- Tab management
- Session switching

---

#### `app/lib/terminal-colors.tsx`
**Purpose:** Terminal color scheme management

**Features:**
- Theme definitions
- ANSI color parsing
- Syntax highlighting

---

### Task Management

#### `app/lib/long-running-task-manager.ts`
**Purpose:** Manage long-running background tasks

**Features:**
- Task queue
- Progress tracking
- Cancellation support
- Result storage

---

#### `app/lib/command-queue-manager.ts`
**Purpose:** Queue and execute commands sequentially

**Features:**
- FIFO queue
- Parallel execution control
- Priority management

---

#### `app/lib/parallel-executor.ts`
**Purpose:** Execute multiple commands in parallel

**Features:**
- Concurrent execution
- Result aggregation
- Error handling

---

### Error Handling

#### `app/lib/error-handler.ts`
**Purpose:** Global error handling

**Features:**
- Error categorization
- Logging
- User notification
- Recovery suggestions

---

#### `app/lib/intelligent-error-recovery.ts`
**Purpose:** AI-powered error recovery

**Features:**
- Error analysis
- Automatic fixes
- Retry strategies

---

#### `app/lib/autonomous-error-recovery.ts`
**Purpose:** Autonomous error resolution

**Features:**
- Self-healing
- Pattern recognition
- Prevention learning

---

### Prompts

#### `app/lib/prompts/unified-agent-prompt.ts`
**Purpose:** Unified system prompt for AI agent

**Features:**
- Comprehensive instructions
- Capability description
- Behavioral guidelines

---

#### `app/lib/prompts/chat-prompt.ts`
**Purpose:** Chat-specific prompts

---

#### `app/lib/prompts/cursor-prompt.ts`
**Purpose:** Cursor-like feature prompts

---

#### `app/lib/prompts/react-prompt.ts`
**Purpose:** React component generation prompts

---

#### `app/lib/prompts/common.ts`
**Purpose:** Common prompt templates

---

### Context & Analysis

#### `app/lib/full-context-builder.ts`
**Purpose:** Build comprehensive context for AI

**Features:**
- Multi-source context
- Intelligent truncation
- Priority-based inclusion

---

#### `app/lib/project-analyzer.ts`
**Purpose:** Analyze project structure

**Features:**
- File tree generation
- Dependency analysis
- Architecture detection

---

#### `app/lib/language-detector.ts`
**Purpose:** Detect programming languages

**Features:**
- Extension-based detection
- Content analysis
- Framework detection

---

### File Operations

#### `app/lib/file-processor.ts`
**Purpose:** Process uploaded files

**Features:**
- Excel parsing
- PDF extraction
- Document conversion

---

#### `app/lib/enhanced-file-operations.ts`
**Purpose:** Advanced file operations

**Features:**
- Batch operations
- Atomic writes
- Backup creation

---

### Session Management

#### `app/lib/ai-conversation-session-manager.ts`
**Purpose:** Manage AI conversation sessions

**Features:**
- Session creation
- Context tracking
- Expiration management

---

#### `app/lib/multi-tab-session-manager.ts`
**Purpose:** Manage sessions across multiple tabs

**Features:**
- Cross-tab communication
- State synchronization
- Shared storage

---

### Automation

#### `app/lib/playwright-service.ts`
**Purpose:** Playwright automation service

**Features:**
- Browser instance management
- Action execution
- Result capture

---

#### `app/lib/code-templates.ts`
**Purpose:** Code generation templates

**Features:**
- Template library
- Variable interpolation
- Language-specific templates

---

#### `app/lib/cursor-like-features.ts`
**Purpose:** Cursor IDE features

**Features:**
- Code completion
- Inline suggestions
- Refactoring tools

---

#### `app/lib/enhanced-agent-capabilities.ts`
**Purpose:** Extended agent capabilities

**Features:**
- Advanced reasoning
- Tool composition
- Multi-step planning

---

### Reporting

#### `app/lib/professional-report-generator.ts`
**Purpose:** Generate professional reports

**Features:**
- PDF generation
- Chart creation
- Data visualization

---

### Configuration

#### `app/lib/config/validate-env.ts`
**Purpose:** Environment variable validation

**Features:**
- Required variable checking
- Type validation
- Default values

---

#### `app/lib/constants/agent-config.ts`
**Purpose:** Agent configuration constants

**Configuration:**
```typescript
export const AGENT_CONFIG = {
  CONTEXT_WINDOW: 1000000,      // 1M tokens
  MAX_OUTPUT_TOKENS: 64000,     // 64K tokens
  DEFAULT_MODEL: 'claude-sonnet-4-5',
  TEMPERATURE: 0.4,
  CACHE_TTL: 3600,
  MAX_RETRIES: 3
}
```

---

#### `app/lib/utils/logger.ts`
**Purpose:** Logging utility

**Features:**
- Structured logging
- Log levels
- File/console output

---

## 🔤 Types & Interfaces

### `app/types/index.ts`
**Purpose:** Central TypeScript type definitions

**Key Type Categories:**

#### SSH Types
```typescript
interface SSHCredentials {
  host: string
  username: string
  password?: string
  keyContent?: string
  passphrase?: string
  useKey: boolean
}

interface SSHSession {
  connection: Client
  host: string
  username: string
  connected: boolean
  createdAt: number
  lastActivity: number
  authMethod: 'SSH Key' | 'Password'
  shellReady?: boolean
}

interface SSHConnectionResult {
  success: boolean
  sessionId?: string
  authMethod?: string
  wsURL?: string
  serverInfo?: object
  credentials?: object  // For auto-reconnect
}
```

#### WebSocket Types
```typescript
interface WebSocketMessage {
  type: string
  content?: string
  data?: unknown
  sessionId?: string
}

interface TerminalWebSocketData {
  type: 'command' | 'output' | 'status' | 'resize' | 'error'
  content?: string
  output?: string
  metadata?: TerminalOutputMetadata
}
```

#### Terminal State
```typescript
interface TerminalState {
  isConnected: boolean
  isShellReady: boolean
  currentPath: string
  currentUser: string
  currentHost: string
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'
  lastCommand?: string
  lastOutput?: string[]
  sessionId?: string
}
```

#### AI Types
```typescript
interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'code' | 'text' | 'react_task'
  isTyping?: boolean
  metadata?: MessageMetadata
  webSearch?: WebSearchConfig
  citations?: WebSearchCitation[]
  toolsUsed?: ToolUsage[]
}

interface AIModel {
  id: string
  name: string
  description: string
  provider: 'anthropic' | 'openai' | 'google' | 'openrouter'
  contextWindow: number
  supportsStreaming?: boolean
}
```

#### MCP Types
```typescript
interface MCPServer {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'error'
  category: string
  tools: MCPTool[]
  running: boolean
}

interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
```

#### Task Types
```typescript
interface LongRunningTask {
  id: string
  name: string
  commands: string[]
  currentStep: number
  totalSteps: number
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  startTime: number
  results: TaskStepResult[]
}

interface CommandResult {
  success: boolean
  output?: string
  error?: string
  exitCode?: number
  duration?: number
}
```

---

### `app/types/socket-types.ts`
**Purpose:** Socket.io-specific types

---

### `app/types/prompt-builder.ts`
**Purpose:** Prompt building types

---

## ⚙️ Configuration Files

### `server.js`
**Purpose:** Custom Next.js server with Socket.io integration

**Key Features:**
- **HTTP server** with Next.js handler
- **Socket.io integration** for real-time communication
- **SSH session management** loading and initialization
- **AI conversation session manager** with auto-cleanup
- **WebSocket handlers:**
  - `auth` - Session authentication with retry logic
  - `command` - Command execution
  - `resize` - Terminal resize
  - `disconnect` - Clean disconnection

**Server Configuration:**
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: dev ? "*" : [process.env.FRONTEND_URL, ...allowedOrigins]
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io',
  pingTimeout: dev ? 60000 : 30000,
  pingInterval: dev ? 25000 : 10000
})
```

**Session Authentication Flow:**
1. Client emits `auth` event with `sessionId`
2. Server looks up session (with retry logic - 3 attempts, 500ms delay)
3. On success: Create shell, set up handlers
4. Emit `authenticated` event to client

**Terminal Shell Setup:**
```javascript
connection.shell((err, stream) => {
  sshShell = stream
  
  // Output handler
  stream.on('data', (data) => {
    socket.emit('output', { output: data.toString('utf-8') })
  })
  
  // Command handler
  socket.on('command', ({ command }) => {
    stream.write(command + '\n')
  })
})
```

**Port:** 5000 (configurable via `PORT` env var)

---

### `package.json`
**Purpose:** Project dependencies and scripts

**Scripts:**
- `dev` - Start development server with Socket.io
- `build` - Build production bundle
- `start` - Start production server
- `lint` - Run ESLint

**Key Dependencies:**
- **AI:** `@anthropic-ai/sdk` (0.70.1)
- **Terminal:** `@xterm/xterm` (5.5.0)
- **SSH:** `ssh2` (1.16.0)
- **WebSocket:** `socket.io` (4.8.1), `socket.io-client` (4.8.1)
- **React:** `react` (18), `react-dom` (18)
- **Next.js:** `next` (14.2.31)
- **MCP:** `@modelcontextprotocol/sdk` (1.13.3), `@upstash/context7-mcp` (1.0.14)
- **Embeddings:** `@qdrant/js-client-rest` (1.15.1)
- **Automation:** `puppeteer` (22.15.0), `playwright` (1.44.1)
- **File Processing:** `xlsx` (0.18.5), `pdf-parse` (2.4.5), `docx` (9.5.1)
- **UI:** `framer-motion` (10.16.5), `lucide-react` (0.294.0)

---

### `next.config.js`
**Purpose:** Next.js configuration

**Key Settings:**
- React strict mode
- Webpack externals configuration
- Image optimization settings
- API route configuration

---

### `tsconfig.json`
**Purpose:** TypeScript configuration

**Compiler Options:**
- Target: ES2017
- Module: ESNext
- Strict mode: enabled
- Path aliases: `@/*` → `./app/*`

---

### `tailwind.config.js`
**Purpose:** Tailwind CSS configuration

**Content Paths:**
- `./app/**/*.{js,ts,jsx,tsx}`
- `./pages/**/*.{js,ts,jsx,tsx}`
- `./components/**/*.{js,ts,jsx,tsx}`

**Custom Theme:**
- Colors, fonts, spacing, breakpoints

---

### `postcss.config.js`
**Purpose:** PostCSS configuration

**Plugins:**
- `tailwindcss`
- `autoprefixer`

---

### `.eslintrc.json`
**Purpose:** ESLint configuration

**Extends:**
- `next/core-web-vitals`

---

### Docker Configuration

#### `docker-compose.yml`
**Purpose:** Docker Compose configuration

**Services:**
- Next.js app
- Qdrant vector database
- Redis cache (optional)

---

#### `Dockerfile` (if exists)
**Purpose:** Docker image definition

---

### Environment Files

#### `.env.local` (example)
**Required Environment Variables:**
```
ANTHROPIC_API_KEY=your_api_key_here
BASE_URL=http://localhost:5000
QDRANT_URL=http://localhost:6333
NODE_ENV=development
```

---

## 🧪 Test Files

### `test-autonomous-agent.js`
**Purpose:** Test autonomous agent capabilities

---

### `test-enhanced-ssh.js`
**Purpose:** Test enhanced SSH features

---

### `test-mcp.js`
**Purpose:** Test MCP server integration

---

### `test-ssh-connection.js`
**Purpose:** Test SSH connection establishment

---

### `test-ssh.js`
**Purpose:** General SSH functionality tests

---

### `test-terminal-sync.js`
**Purpose:** Test terminal synchronization

---

## 📄 Documentation

### `README.md`
**Purpose:** Project readme and setup instructions

---

### `QUICK_START.md`
**Purpose:** Quick start guide

---

### `FIXES_APPLIED.md`
**Purpose:** Record of fixes and patches

---

### `EMPTY_MESSAGE_FIX.md`
**Purpose:** Documentation of empty message bug fix

---

### `docs/` Directory
**Contains:** 198 markdown documentation files

---

## 🚀 Key Technologies & Patterns

### 1. Claude Sonnet 4.5 Integration
- **1M context window** - Massive context for complex tasks
- **64K max output** - Long-form responses
- **Prompt caching** - 90% cost savings on repeated prompts
- **Direct SDK** - No intermediary APIs

### 2. Socket.io Real-time Communication
- **Bidirectional** client-server communication
- **Auto-reconnection** with session restoration
- **Event-driven** architecture
- **Namespaced** connections for isolation

### 3. SSH2 Protocol
- **Real SSH connections** to any server
- **Password & key auth** support
- **Keep-alive** for long sessions
- **Retry logic** for reliability

### 4. MCP (Model Context Protocol)
- **Modular tool system**
- **Built-in services** + external servers
- **Auto-start** and health monitoring
- **Extensible architecture**

### 5. Vector Embeddings (Qdrant)
- **Semantic code search**
- **Relevance ranking**
- **Fast retrieval** (sub-second)
- **Incremental indexing**

### 6. React Hooks Architecture
- **Custom hooks** for separation of concerns
- **State management** without Redux
- **Reusable logic** across components
- **Performance optimized**

### 7. TypeScript Type Safety
- **Strict mode** enabled
- **Comprehensive types** for all interfaces
- **Type guards** for runtime safety
- **No 'any' usage** (eliminated)

### 8. Next.js App Router
- **Server Components** for performance
- **Streaming SSR** for fast page loads
- **API Routes** for backend logic
- **File-based routing**

### 9. Error Handling Strategy
- **Graceful degradation**
- **Retry logic** with exponential backoff
- **User-friendly messages**
- **Detailed logging** for debugging

### 10. Caching Strategy
- **Multi-level caching:**
  - Browser cache (IndexedDB)
  - In-memory cache (Node.js)
  - Prompt cache (Anthropic)
- **Cache invalidation** rules
- **TTL-based expiration**

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   React UI   │  │ XTerm.js     │  │  Socket.io      │    │
│  │  Components  │  │  Terminal    │  │  Client         │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘    │
│         │                  │                    │             │
└─────────┼──────────────────┼────────────────────┼─────────────┘
          │                  │                    │
          │ HTTP/REST        │ WebSocket          │
          ↓                  ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js)                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Next.js     │  │  Socket.io   │  │  SSH2 Client    │   │
│  │  API Routes   │  │  Server      │  │  Manager        │   │
│  └──────┬────────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                   │                    │            │
│         ↓                   ↓                    ↓            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Agent Intelligence Layer                    │   │
│  │  - Semantic Search  - Memory  - Context Building     │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Anthropic    │  │   Qdrant      │  │  MCP Servers    │   │
│  │  Claude API   │  │  Vector DB    │  │  (Context7)     │   │
│  └───────────────┘  └───────────────┘  └─────────────────┘   │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  Remote SSH   │  │  Puppeteer/   │                        │
│  │  Servers      │  │  Playwright   │                        │
│  └───────────────┘  └───────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Considerations

### 1. SSH Credentials
- **Never stored in plain text**
- **Encrypted at rest**
- **In-memory only during session**
- **Auto-cleanup on disconnect**

### 2. API Keys
- **Environment variables only**
- **Never committed to git**
- **Server-side only**
- **Validated on startup**

### 3. Command Execution
- **User confirmation** for destructive commands
- **Sandboxed execution** for local commands
- **SSH session isolation**
- **Command logging**

### 4. File Operations
- **Path traversal protection**
- **File size limits**
- **Type validation**
- **Virus scanning** (optional)

### 5. WebSocket Security
- **Session authentication**
- **CORS configuration**
- **Rate limiting**
- **Connection timeout**

---

## 🎯 Performance Optimizations

### 1. Prompt Caching
- **Anthropic ephemeral cache**
- **90% cost savings** on repeated prompts
- **Automatic cache management**

### 2. Response Caching
- **In-memory cache** for repeated queries
- **TTL-based expiration**
- **Cache hit metrics**

### 3. Code Splitting
- **Dynamic imports** for large components
- **Route-based splitting**
- **Lazy loading** for modals

### 4. WebSocket Optimization
- **Binary data transfer** where possible
- **Compression** for large payloads
- **Batch updates** for multiple changes

### 5. Terminal Performance
- **Virtual scrolling** for large outputs
- **Debounced rendering**
- **Efficient ANSI parsing**

---

## 🐛 Known Issues & Limitations

### 1. SSH Keep-Alive
- **Issue:** Some servers may close idle connections
- **Mitigation:** Aggressive keep-alive (30s interval)
- **Fallback:** Auto-reconnect on disconnect

### 2. Large File Processing
- **Issue:** Memory constraints for files >100MB
- **Mitigation:** Streaming processing
- **Limitation:** PDF parsing may timeout

### 3. Qdrant Indexing
- **Issue:** Initial indexing takes time for large codebases
- **Mitigation:** Incremental indexing
- **Limitation:** Requires Qdrant server running

### 4. Browser Automation
- **Issue:** Some sites block headless browsers
- **Mitigation:** User-agent spoofing
- **Limitation:** CAPTCHAs cannot be bypassed

---

## 🚀 Future Enhancements

### Planned Features
1. **Multi-user support** - Team collaboration
2. **Session recording** - Replay terminal sessions
3. **Custom MCP servers** - User-defined tools
4. **Plugin system** - Extensibility framework
5. **Mobile app** - iOS/Android clients
6. **Browser extension** - Chrome/Firefox integration
7. **Code review** - AI-powered code analysis
8. **Performance profiling** - Built-in profiler
9. **Multi-language support** - i18n
10. **Dark/light themes** - User preferences

---

## 📞 Support & Contact

For issues, questions, or contributions:
- **GitHub:** (repository URL)
- **Email:** support@latenite.ai
- **Docs:** https://docs.latenite.ai

---

## 📝 License

(License information)

---

## 🙏 Acknowledgments

- **Anthropic** - Claude Sonnet 4.5 API
- **Next.js** - React framework
- **XTerm.js** - Terminal emulator
- **Socket.io** - Real-time engine
- **ssh2** - SSH protocol
- **Qdrant** - Vector database
- **Context7** - Documentation service

---

**Document End**

*This documentation was generated by analyzing the complete Latenite.ai codebase as of February 9, 2026. For the most up-to-date information, please refer to the latest code and inline documentation.*
