# 👥 Team Setup Guide - Getting Your Team Started with Latenite AI

## 🎯 **For Team Lead/Admin:**

### **Step 1: Initial Setup (5 minutes)**

```bash
# 1. Ensure Docker is installed
docker --version
docker-compose --version

# 2. Clone the repository
git clone <your-repo-url>
cd Latenite.ai

# 3. Create environment file
cp .env.docker.example .env

# 4. Add your team's API keys
nano .env  # or use any editor
```

**Edit .env:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-TEAM-KEY-HERE
OPENAI_API_KEY=sk-proj-YOUR-TEAM-KEY-HERE  # Optional
```

### **Step 2: Test Deployment**

```bash
# Build and start
docker-compose up -d

# Check health
curl http://localhost:5000/api/health

# View logs
docker-compose logs -f
```

### **Step 3: Share with Team**

**Send team members:**
1. Repository URL
2. `.env` file (securely - use password manager)
3. This guide

---

## 🚀 **For Team Members:**

### **Quick Start (2 minutes):**

```bash
# 1. Clone repository
git clone <repo-url-from-team-lead>
cd Latenite.ai

# 2. Get .env file from team lead
# Save it as .env in the project root

# 3. Start Docker
docker-compose up -d

# 4. Open browser
http://localhost:5000

# ✅ You're ready to go!
```

---

## 🌐 **Access Options:**

### **Option 1: Local (Each Person Runs Own Instance)**
```
Each team member:
- Runs Docker on their own machine
- Accesses http://localhost:5000
- Independent instances
- No shared sessions

Best for: Remote teams, individual work
```

### **Option 2: Shared Server (Central Deployment)**
```
Team lead deploys to server:
- Single deployment on server
- Team accesses http://team-server.com:5000
- Shared environment
- Collaborative sessions

Best for: Office teams, shared workspace
```

### **Option 3: Cloud Deployment (Production)**
```
Deploy to cloud (AWS/GCP/Azure):
- Professional URL: https://latenite.yourcompany.com
- SSL certificate included
- Scalable to 100+ users
- Always accessible

Best for: Large teams, clients, production use
```

---

## 👤 **Individual Developer Setup:**

### **Prerequisites:**
```bash
# Install Docker Desktop
Windows: https://www.docker.com/products/docker-desktop/
Mac: https://www.docker.com/products/docker-desktop/
Linux: sudo apt install docker.io docker-compose
```

### **Daily Workflow:**
```bash
# Morning: Start services
docker-compose up -d

# Work all day - access anytime
http://localhost:5000

# Evening: Stop services (optional)
docker-compose down

# Next day: Start again (data persists!)
docker-compose up -d
```

---

## 🏢 **Shared Server Deployment:**

### **One-Time Server Setup:**

```bash
# On your team server (Windows/Linux)

# 1. Install Docker
# Windows: Docker Desktop
# Linux: 
sudo apt update
sudo apt install docker.io docker-compose

# 2. Clone repository
git clone <repo-url>
cd Latenite.ai

# 3. Setup environment
cp .env.docker.example .env
nano .env  # Add API keys

# 4. Deploy
docker-compose -f docker-compose.prod.yml up -d --scale latenite-ai=3

# 5. Configure firewall
# Windows: Allow port 80 in Windows Firewall
# Linux: sudo ufw allow 80

# 6. Find server IP
ipconfig  # Windows
ip addr   # Linux

# Example: 192.168.1.100
```

### **Team Access:**
```
Team members access:
http://192.168.1.100

No installation needed!
Just open browser!
```

---

## 🔐 **Security for Shared Deployment:**

### **Basic Auth (Optional but Recommended)**

Create `nginx-auth.conf`:
```nginx
# Add to nginx.conf
auth_basic "Latenite AI Access";
auth_basic_user_file /etc/nginx/.htpasswd;
```

Generate password file:
```bash
# Install apache2-utils
docker run --rm -it httpd:alpine htpasswd -c .htpasswd admin

# Add to docker-compose.yml
nginx:
  volumes:
    - ./.htpasswd:/etc/nginx/.htpasswd:ro
```

Now users need username/password to access!

---

## 📊 **Resource Requirements:**

### **Per Instance:**
```
Minimum:
- CPU: 1 core
- RAM: 1 GB
- Disk: 5 GB

Recommended:
- CPU: 2 cores
- RAM: 2 GB
- Disk: 10 GB

For 10 users:
- CPU: 2-4 cores
- RAM: 4 GB
- Disk: 20 GB
```

### **Scaling Calculator:**
```
Users: 10  → Instances: 1  → Resources: 1 CPU, 2GB RAM
Users: 30  → Instances: 3  → Resources: 3 CPU, 4GB RAM
Users: 50  → Instances: 5  → Resources: 5 CPU, 8GB RAM
Users: 100 → Instances: 10 → Resources: 10 CPU, 16GB RAM
```

---

## 🛠️ **Common Team Workflows:**

### **Workflow 1: Code Review**
```
1. Developer makes changes
2. Commits to feature branch
3. Pushes to GitHub
4. Others pull latest: git pull
5. Rebuild: docker-compose build
6. Restart: docker-compose up -d
7. Test changes
```

### **Workflow 2: Debugging Together**
```
1. Team member finds bug
2. All team members access same server
3. All see same environment
4. Debug collaboratively
5. Fix and redeploy
```

### **Workflow 3: Client Demo**
```
1. Deploy to cloud server
2. Share URL with client
3. Client accesses from anywhere
4. Real-time collaboration
5. Professional presentation
```

---

## 🎓 **Training New Team Members:**

### **Day 1: Setup**
```
Duration: 30 minutes

1. Install Docker Desktop
2. Clone repository
3. Get .env from team lead
4. Run: docker-compose up -d
5. Access: http://localhost:5000
6. Test all features:
   - Connect SSH
   - Upload files
   - Generate docs
   - Chat with AI
```

### **Day 2: Usage**
```
Duration: 1 hour

Learn:
- SSH connection to servers
- AI agent capabilities
- File upload for context
- Document generation
- Terminal commands
```

### **Day 3: Advanced**
```
Duration: 2 hours

Master:
- Docker commands
- Debugging
- Log analysis
- Performance tuning
- Scaling
```

---

## 💡 **Pro Tips for Teams:**

### **1. Shared .env File**
```
Store in secure location:
- Password manager (1Password, LastPass)
- Encrypted git repo
- Secure file share

Don't commit to git!
```

### **2. Consistent Updates**
```bash
# Create update script: update.sh
#!/bin/bash
git pull
docker-compose build
docker-compose up -d
echo "✅ Updated to latest version!"

# Everyone runs: ./update.sh
```

### **3. Shared Documentation**
```
Create team wiki with:
- Common SSH servers
- Frequently used commands
- Best practices
- Troubleshooting steps
```

### **4. Monitoring Dashboard**
```
Set up simple monitoring:
- Uptime monitoring
- Error alerts
- Usage analytics
- Performance metrics
```

---

## 🎊 **Your Team Is Ready!**

**What your team gets:**
- ✅ AI-powered terminal
- ✅ Multi-user support
- ✅ File upload & analysis
- ✅ Auto-documentation
- ✅ Consistent environment
- ✅ Easy collaboration
- ✅ Professional deployment

**Setup time:**
- Lead: 5 minutes
- Team members: 2 minutes each

**Total team onboarding: < 30 minutes!** 🚀

---

*Happy collaborating with Latenite AI!* ✨

