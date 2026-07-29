# 🐳 Quick Docker Start - 30 Seconds to Running!

## ⚡ **Fastest Way to Get Started:**

### **Step 1: Prerequisites (One-time)**
```bash
# Install Docker Desktop
Windows: https://www.docker.com/products/docker-desktop/
Mac: https://www.docker.com/products/docker-desktop/
Linux: sudo apt install docker.io docker-compose
```

### **Step 2: Setup (30 seconds)**
```bash
# 1. Copy environment file
cp .env.docker.example .env

# 2. Edit .env - add your Anthropic API key
notepad .env  # Windows
nano .env     # Linux/Mac

# Change this line:
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
```

### **Step 3: Run!**
```bash
# Windows:
docker-start.bat

# Linux/Mac:
chmod +x docker-start.sh
./docker-start.sh

# Or manually:
docker-compose up -d
```

### **Step 4: Access**
```
Open browser: http://localhost:5000
✅ Done!
```

---

## 🎯 **For Your Entire Team:**

### **Team Lead Does (5 minutes):**
1. Setup .env with team API keys
2. Run `docker-compose up -d`
3. Find server IP: `ipconfig` or `ip addr`
4. Share IP with team

### **Team Members Do (10 seconds):**
1. Open browser
2. Go to: `http://team-server-ip:5000`
3. Start using!

**No installation required!** 🚀

---

## 📊 **Three Deployment Options:**

### **Option 1: Individual (Everyone runs own)**
```bash
# Each person:
git clone <repo>
docker-compose up -d
# Access: http://localhost:5000
```
**Best for:** Remote teams, personal use

### **Option 2: Shared Server (Team access one server)**
```bash
# On server:
docker-compose -f docker-compose.prod.yml up -d --scale latenite-ai=3

# Team accesses: http://server-ip:80
```
**Best for:** Office teams, 10-50 users

### **Option 3: Cloud (Production)**
```bash
# Deploy to AWS/GCP/Azure
docker-compose -f docker-compose.prod.yml up -d --scale latenite-ai=10

# Access: https://latenite.yourcompany.com
```
**Best for:** Large teams, 100+ users, clients

---

## 🔧 **Common Commands:**

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Scale to 5 instances
docker-compose up -d --scale latenite-ai=5

# Check health
curl http://localhost:5000/api/health
```

---

## 🎊 **That's All You Need!**

**Simple workflow:**
1. `docker-compose up -d` ← Start
2. Open browser
3. Use Latenite AI
4. `docker-compose down` ← Stop (when done)

**For team:**
1. Setup once on server
2. Share URL
3. Everyone accesses
4. Collaborate!

---

**🐳 Docker makes deployment EASY!**

*From localhost to production in minutes!* ✨

