# 🐳 Docker Quick Reference Card

## ⚡ **Super Quick Start:**

```bash
# Copy this, paste in terminal, hit Enter:
cp .env.docker.example .env && nano .env && docker-compose up -d
```
**Then add your API key and save!**

---

## 📋 **Essential Commands:**

| Action | Command |
|--------|---------|
| **Start** | `docker-compose up -d` |
| **Stop** | `docker-compose down` |
| **Logs** | `docker-compose logs -f` |
| **Restart** | `docker-compose restart` |
| **Status** | `docker-compose ps` |
| **Scale to 5** | `docker-compose up -d --scale latenite-ai=5` |
| **Health** | `curl http://localhost:5000/api/health` |
| **Shell** | `docker exec -it latenite-ai sh` |
| **Clean** | `docker-compose down -v` |

---

## 🎯 **Quick Access:**

```
Local:       http://localhost:5000
Network:     http://YOUR_IP:5000
Production:  http://your-domain.com
```

---

## 🔧 **Troubleshooting:**

| Problem | Solution |
|---------|----------|
| Can't start | `docker-compose logs latenite-ai` |
| Port in use | Change port in docker-compose.yml |
| Out of memory | `docker system prune -a` |
| Can't access | Check firewall, allow port 5000 |

---

## 📊 **Scaling Guide:**

```bash
# 1-10 users:
docker-compose up -d

# 10-50 users:
docker-compose up -d --scale latenite-ai=3

# 50-100 users:
docker-compose up -d --scale latenite-ai=5

# 100+ users:
docker-compose up -d --scale latenite-ai=10
```

---

## 🎊 **Done!**

**Most common workflow:**
```bash
docker-compose up -d     # Start
# ... work ...
docker-compose down      # Stop
```

**That's all you need!** 🚀

