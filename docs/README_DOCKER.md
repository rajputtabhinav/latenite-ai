# 🐳 Latenite AI Terminal - Docker Edition

## 🎯 **AI-Powered Terminal with Docker Support**

Professional terminal with Claude Sonnet 4.5 AI, now **fully Dockerized** for easy team deployment!

---

## ⚡ **Quick Start (30 seconds):**

```bash
# 1. Copy environment file
cp .env.docker.example .env

# 2. Add your Anthropic API key to .env
# ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# 3. Start Docker
docker-compose up -d

# 4. Access
http://localhost:5000
```

**Done!** 🎉

---

## ✨ **Features:**

### **Terminal Features:**
- 🖥️ Full SSH terminal with XTerm.js
- 🔌 Real-time WebSocket communication
- 📊 Session persistence
- 🎯 Smart command suggestions
- 🔐 Secure SSH connections

### **AI Features:**
- 🤖 Claude Sonnet 4.5 (1M context window)
- 🛑 Stop generation anytime
- 📎 Upload files (images, PDFs, Excel, docs)
- 📄 Auto-generate documentation
- 🧠 Context-aware responses
- 💬 Conversation memory

### **Collaboration Features:**
- 👥 Multi-user support
- 🐳 Docker deployment
- 🔄 Easy scaling
- 🌐 Load balanced
- 📡 Shared or independent instances

---

## 🎨 **Screenshot:**

```
┌──────────────────────────────────────────────────┐
│  Latenite AI Terminal               🏠 📜 Agent │
├──────────────────────────────────────────────────┤
│ $ systemctl status nginx                         │
│ ● nginx.service - A high performance web server  │
│   Loaded: loaded                                 │
│   Active: active (running)                       │
│                                                  │
│ [AI Agent Panel →]                               │
│  🤖 Ask me anything...                           │
│  📎 Upload images, docs, data                    │
│  📄 Generate documentation                       │
└──────────────────────────────────────────────────┘
```

---

## 🚀 **Deployment Options:**

### **1. Local Development:**
```bash
docker-compose -f docker-compose.dev.yml up
```
- Hot reload enabled
- Perfect for coding

### **2. Single Instance:**
```bash
docker-compose up -d
```
- Production build
- 1-10 users

### **3. Scaled Production:**
```bash
docker-compose -f docker-compose.prod.yml up -d --scale latenite-ai=5
```
- Load balanced
- 50-100+ users

---

## 📦 **System Requirements:**

### **Minimum:**
- Docker Desktop or Docker Engine
- 1 CPU core
- 2GB RAM
- 5GB disk space

### **Recommended:**
- 2+ CPU cores
- 4GB RAM
- 10GB disk space

---

## 📚 **Documentation:**

- 📖 [Complete Docker Guide](DOCKER_DEPLOYMENT_GUIDE.md)
- 👥 [Team Setup](TEAM_SETUP_GUIDE.md)
- ⚡ [Quick Start](QUICK_DOCKER_START.md)
- 🎯 [Feature Guide](VISUAL_FEATURE_GUIDE.md)

---

## 🛠️ **Tech Stack:**

- **Frontend:** Next.js 14, React 18, TailwindCSS
- **Backend:** Node.js, Socket.io, Express
- **Terminal:** XTerm.js with SSH2
- **AI:** Anthropic Claude Sonnet 4.5
- **File Processing:** mammoth, xlsx, pdf-parse, jsPDF
- **Database:** Qdrant (vector search)
- **Deployment:** Docker, Docker Compose, Nginx

---

## 🎯 **Use Cases:**

- ✅ DevOps terminal access
- ✅ System administration
- ✅ Performance testing & documentation
- ✅ Log analysis with AI
- ✅ Collaborative debugging
- ✅ Team training & demos
- ✅ Client presentations

---

## 🌟 **What Makes It Special:**

| Feature | Latenite AI | Regular Terminal | ChatGPT |
|---------|-------------|------------------|---------|
| Real terminal | ✅ | ✅ | ❌ |
| AI assistance | ✅ | ❌ | ✅ |
| File upload | ✅ | ❌ | ✅ |
| Vision analysis | ✅ | ❌ | ✅ |
| Auto-docs | ✅ | ❌ | ❌ |
| SSH support | ✅ | ✅ | ❌ |
| Multi-user | ✅ | ✅ | ✅ |
| Dockerized | ✅ | ❌ | ❌ |

**= THE ULTIMATE AI TERMINAL!** 🏆

---

## 📄 **License:**

MIT License - Free for personal and commercial use

---

## 🤝 **Contributing:**

```bash
# 1. Fork the repository
# 2. Create feature branch
# 3. Make changes
# 4. Test with Docker
docker-compose up
# 5. Submit PR
```

---

## 🎊 **Get Started Now:**

```bash
git clone <your-repo-url>
cd Latenite.ai
cp .env.docker.example .env
# Edit .env with your API key
docker-compose up -d
```

**Access: http://localhost:5000**

**That's it!** 🚀

---

*Built with ❤️ for developers, by developers*
*Powered by Claude Sonnet 4.5 & Docker* 🐳

