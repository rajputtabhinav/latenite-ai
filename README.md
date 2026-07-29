# Latenite.ai - OMNIPOTENT AI System with Context7 MCP Integration

<div align="center">
  <h1>🔥 Latenite.ai</h1>
  <p><strong>The Ultimate AI System Administrator with UNLIMITED POWERS</strong></p>
  <p>Real command execution • System management • MCP Context7 integration • SSH capabilities • Fast AI streaming</p>
</div>

## 🚀 Overview

Latenite.ai is an OMNIPOTENT AI system that provides **unlimited administrator powers** with real command execution, system management, and cutting-edge MCP (Model Context Protocol) integration. This isn't just another AI assistant - it's a complete system administrator with the ability to perform any task on your system.

### 🌟 Key Features

- **🔥 UNLIMITED SYSTEM POWERS**: Execute any command with full admin privileges
- **🔌 MCP Context7 Integration**: Access up-to-date documentation for any library
- **⚡ Real-time AI Streaming**: 95% faster responses with thinking + typing animation
- **🖥️ SSH Capabilities**: Remote server management and execution
- **🛠️ System Administration**: Complete file operations, package management, services control
- **🧠 Expert-Level AI**: Senior developer + system administrator knowledge
- **🔐 Smart Security**: Safe command execution with dangerous operation prevention
- **🌐 Cross-Platform**: Windows, Linux, macOS support

## 📋 Table of Contents

- [Installation](#installation)
- [MCP Context7 Integration](#mcp-context7-integration)
- [Features](#features)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [System Requirements](#system-requirements)
- [Security](#security)
- [Contributing](#contributing)

## 🛠️ Installation

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm or yarn package manager
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/latenite.ai.git
cd latenite.ai

# Install dependencies
npm install

# Start the development server
npm run dev

# Your AI system is now running on http://localhost:3000
```

### Production Setup

```bash
# Build the application
npm run build

# Start in production mode
npm start
```

## 🔌 MCP Context7 Integration

Latenite.ai now includes **Context7 MCP (Model Context Protocol)** integration, providing access to up-to-date documentation for any library or framework.

### What is Context7 MCP?

Context7 MCP is a revolutionary protocol that allows AI systems to access real-time, up-to-date documentation for any library, framework, or tool. This means the AI always has the latest information, not just what was in its training data.

### How to Use Context7

1. **Enable MCP**: Toggle the MCP switch in the AI agent interface
2. **Use the Magic Words**: Add "use context7" to your prompts
3. **Get Latest Docs**: The AI will fetch current documentation and provide accurate, up-to-date solutions

### Example Usage

```
Create a Next.js app with the latest app router. use context7
```

```
Setup a PostgreSQL database with Prisma ORM. use context7
```

```
Implement authentication with NextAuth.js. use context7
```

### MCP Features

- **🔍 Library Resolution**: Automatically finds the correct library documentation
- **📚 Documentation Fetching**: Retrieves up-to-date code examples and best practices
- **🔄 Real-time Updates**: Always uses the latest version documentation
- **🎯 Smart Context**: Provides relevant documentation based on your specific needs

## 🎯 Features

### System Administration Powers

- **📦 Package Management**: Install/update packages (npm, pip, apt, chocolatey)
- **🗂️ File Operations**: Create, read, update, delete files and directories
- **🔧 Service Management**: Start, stop, restart system services
- **🌐 Network Operations**: Configure network settings, manage connections
- **🔐 Security Management**: User permissions, firewall configuration
- **📊 System Monitoring**: Real-time system metrics and logs

### Development Capabilities

- **💻 Code Execution**: Run code in any programming language
- **🔨 Build & Deploy**: Compile projects, deploy applications
- **📱 App Development**: Create full-stack applications
- **🗄️ Database Management**: Setup and manage databases
- **🐳 Container Operations**: Docker and Kubernetes management
- **☁️ Cloud Integration**: AWS, Azure, GCP operations

### AI & Communication

- **🧠 Expert Knowledge**: Senior-level expertise in all programming languages
- **⚡ Fast Streaming**: Real-time AI responses with thinking indicators
- **🔄 Context Awareness**: Maintains conversation context and terminal state
- **📋 Code Integration**: Direct code insertion to terminal
- **🎨 Beautiful UI**: Modern, responsive interface with animations

### SSH & Remote Management

- **🔗 SSH Connections**: Secure remote server access
- **🖥️ Terminal Integration**: Full terminal emulation with command history
- **📡 Real-time Execution**: Live command execution and output streaming
- **🔐 Secure Authentication**: Key-based and password authentication

## 🎮 Usage

### Basic Usage

1. **Open the AI Agent**: Click the floating AI button or use the terminal
2. **Ask Anything**: The AI can handle any system administration or coding task
3. **Enable MCP**: Toggle Context7 MCP for latest documentation
4. **Execute Commands**: The AI will run real commands on your system

### Advanced Usage

#### System Administration

```
Install Docker and setup a development environment
```

```
Create a new user with sudo privileges
```

```
Setup a web server with SSL certificates
```

#### Development Tasks

```
Create a React app with TypeScript and Tailwind CSS. use context7
```

```
Setup a Node.js API with Express and MongoDB. use context7
```

```
Deploy this application to AWS with auto-scaling. use context7
```

#### SSH Operations

```
Connect to my production server and check system status
```

```
Deploy the latest version of my app to the remote server
```

### MCP Context7 Commands

- **Library Documentation**: `"Create a FastAPI app with authentication. use context7"`
- **Framework Setup**: `"Setup React with Next.js 14. use context7"`
- **Tool Configuration**: `"Configure Kubernetes with Helm. use context7"`

## 🔧 API Documentation

### AI Streaming API

```typescript
POST /api/ai/stream
{
  "messages": [
    { "role": "user", "content": "Your message" }
  ],
  "provider": "anthropic" | "openai",
  "model": "claude-sonnet-4",
  "mcpEnabled": true,
  "mcpContext": "Context7 documentation provided"
}
```

### MCP Integration API

```typescript
// Get MCP server status
GET /api/mcp?action=status

// Start Context7 MCP server
GET /api/mcp?action=start

// Stop Context7 MCP server
GET /api/mcp?action=stop

// Invoke MCP tool
POST /api/mcp
{
  "tool": "resolve-library-id",
  "parameters": {
    "libraryName": "react"
  }
}
```

### System Execution API

```typescript
POST /api/system/execute
{
  "command": "ls -la",
  "type": "shell"
}
```

### SSH API

```typescript
POST /api/ssh/connect
{
  "host": "your-server.com",
  "username": "admin",
  "password": "password"
}
```

## 💻 System Requirements

### Minimum Requirements

- **OS**: Windows 10, macOS 10.15, or Linux (Ubuntu 18.04+)
- **Node.js**: 18.0.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free space
- **Network**: Internet connection for MCP Context7 integration

### Recommended Requirements

- **OS**: Windows 11, macOS 12+, or Linux (Ubuntu 20.04+)
- **Node.js**: 20.0.0 or higher
- **RAM**: 16GB or more
- **Storage**: 5GB free space
- **Network**: High-speed internet for optimal MCP performance

## 🔒 Security

### Security Features

- **🛡️ Command Validation**: Smart prevention of dangerous operations
- **🔐 Sandboxed Execution**: Safe command execution environment
- **🔑 Authentication**: Secure SSH key management
- **📋 Audit Logging**: Complete operation history and logs
- **⚠️ Warning System**: Clear warnings for potentially destructive operations

### Best Practices

1. **Review Commands**: Always review commands before execution
2. **Backup Systems**: Ensure you have backups before major operations
3. **Test Environment**: Use in a test environment first
4. **Monitor Logs**: Check logs for any suspicious activity
5. **Update Regularly**: Keep the system and dependencies updated

## 🤝 Contributing

We welcome contributions to Latenite.ai! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/latenite.ai.git
cd latenite.ai

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.latenite.ai](https://docs.latenite.ai)
- **Issues**: [GitHub Issues](https://github.com/yourusername/latenite.ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/latenite.ai/discussions)
- **Email**: support@latenite.ai

## 🙏 Acknowledgments

- **Anthropic**: For the Claude AI models
- **OpenAI**: For GPT models
- **Upstash**: For Context7 MCP server
- **Vercel**: For hosting and deployment
- **Next.js**: For the amazing framework
- **Tailwind CSS**: For beautiful styling

---

<div align="center">
  <p><strong>🔥 Latenite.ai - Where AI meets UNLIMITED POWER 🔥</strong></p>
  <p>Made with ❤️ by the Latenite.ai team</p>
</div> 