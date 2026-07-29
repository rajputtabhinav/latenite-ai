# 🔧 SSH Setup Instructions - Real SSH Connections

Your **Latenite AI Terminal** supports **real SSH connections** to any server. Here's how to use it:

## 🚀 **Quick Setup (3 steps)**

### **1. Install SSH2 Package**
```bash
npm install ssh2 @types/ssh2
```

### **2. Enable Real SSH Code**
In `app/api/ssh/connect/route.ts` and `app/api/ssh/terminal/route.ts`:

**Uncomment these lines:**
```typescript
// Remove the // from these lines:
import { Client } from 'ssh2'

// And uncomment the entire SSH implementation blocks
```

### **3. Restart Development Server**
```bash
npm run dev
```

## 🎯 **SSH Connection Features**

### **What You Get:**
- ✅ **Real SSH connections** to any server
- ✅ **Actual command execution** on remote servers
- ✅ **Live terminal sessions** with full functionality
- ✅ **SSH key authentication** support
- ✅ **Real-time command output**
- ✅ **Session management** with auto-cleanup
- ✅ **Connection timeout** handling

## 🔐 **Testing Real SSH Connections**

Once setup is complete, you can connect to:

### **Your Own Servers:**
- **Host**: Your server IP (e.g., `198.51.100.1`)
- **Username**: Your actual username
- **Password**: Your real password
- **SSH Key**: Your actual private key

### **Example Real Connections:**
```bash
# VPS Server
Host: your-vps-ip.com
Username: root
Password: your-password

# AWS EC2
Host: ec2-xxx-xxx-xxx-xxx.compute-1.amazonaws.com  
Username: ubuntu
SSH Key: your-ec2-key.pem content

# DigitalOcean Droplet
Host: 165.227.xxx.xxx
Username: root
Password: your-password
```

## 🛡️ **Security Features**

The real SSH implementation includes:
- ✅ **20-second connection timeout**
- ✅ **Keepalive every 30 seconds**
- ✅ **Proper error handling**
- ✅ **Session management** 
- ✅ **Private key validation**

## 📋 **Key Implementation Files**

1. **`app/api/ssh/connect/route.ts`** - SSH connection handling
2. **`app/api/ssh/terminal/route.ts`** - Command execution
3. **`app/api/ssh/disconnect/route.ts`** - Session cleanup
4. **`app/api/ssh/status/route.ts`** - Connection monitoring

## 🎉 **Ready to Go!**

Your Latenite AI Terminal has **full SSH capabilities** combined with **advanced AI features**!

---

**Need help?** The SSH system provides clear error messages and connection diagnostics to help troubleshoot any issues. 