# 🚀 VPS Deployment Guide - PMS Screener on Hostinger

## ⚠️ IMPORTANT: Safe Deployment Strategy
This guide ensures **ZERO impact** on your existing project. We'll deploy PMS Screener as `/pms-screener` alongside your existing application.

---

## 📋 Pre-Deployment Checklist

1. ✅ Code pushed to GitHub: https://github.com/Manideepgadi1/fundscreener
2. ✅ Port verified: **8004** (already assigned for PMS Screener)
3. ✅ Path confirmed: `/pms-screener` (based on git config)
4. ✅ No existing files will be touched

---

## 🔧 Step-by-Step Deployment

### Step 1: SSH into Your VPS
```bash
ssh root@82.25.105.18
# Or use your Hostinger credentials
```

---

### Step 2: Navigate to Web Directory (DON'T CHANGE EXISTING FILES)
```bash
# Check current directory
pwd

# Go to web root if not there
cd /var/www/
```

---

### Step 3: Pull the Project from GitHub
```bash
# Clone ONLY if not exists, otherwise pull
if [ -d "fundscreener" ]; then
    echo "Directory exists, pulling latest changes..."
    cd fundscreener
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/Manideepgadi1/fundscreener.git
    cd fundscreener
fi
```

---

### Step 4: Setup Python Environment
```bash
# Make sure you're in /var/www/fundscreener
cd /var/www/fundscreener

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Deactivate for now
deactivate
```

---

### Step 5: Verify Environment File
```bash
# Create/update .env file
cat > .env << 'EOF'
FLASK_CONFIG=production
FLASK_HOST=0.0.0.0
FLASK_PORT=8004
FLASK_DEBUG=False
EOF

# Set proper permissions
chmod 644 .env
```

---

### Step 6: Check if Systemd Service Exists
```bash
# Check if fundscreener service already exists
sudo systemctl status fundscreener
```

**If service exists:**
```bash
# Just reload and restart
sudo systemctl daemon-reload
sudo systemctl restart fundscreener
sudo systemctl status fundscreener
```

**If service doesn't exist, create it:**
```bash
# Create new systemd service
sudo nano /etc/systemd/system/fundscreener.service
```

Paste this content:
```ini
[Unit]
Description=PMS Screener - Fund Comparison Tool
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/fundscreener
Environment="PATH=/var/www/fundscreener/venv/bin"
ExecStart=/var/www/fundscreener/venv/bin/gunicorn \
    --workers 4 \
    --bind 0.0.0.0:8004 \
    --timeout 120 \
    --access-logfile /var/log/fundscreener/access.log \
    --error-logfile /var/log/fundscreener/error.log \
    wsgi:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, Y, Enter)

```bash
# Create log directory
sudo mkdir -p /var/log/fundscreener
sudo chown www-data:www-data /var/log/fundscreener

# Set proper permissions on app directory
sudo chown -R www-data:www-data /var/www/fundscreener

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable fundscreener
sudo systemctl start fundscreener
sudo systemctl status fundscreener
```

---

### Step 7: Update Nginx Configuration (CAREFULLY!)

**⚠️ CRITICAL: Backup existing nginx config first!**
```bash
# Backup current nginx config
sudo cp /etc/nginx/sites-enabled/combined /etc/nginx/sites-enabled/combined.backup.$(date +%Y%m%d_%H%M%S)
```

Now edit the nginx configuration:
```bash
sudo nano /etc/nginx/sites-enabled/combined
```

**Find the server block and ADD this location block** (don't remove existing ones):
```nginx
    # PMS Screener - Fund Comparison Tool
    location /pms-screener {
        # Remove trailing slash and redirect
        rewrite ^/pms-screener$ /pms-screener/ permanent;
    }
    
    location /pms-screener/ {
        proxy_pass http://127.0.0.1:8004/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
```

**Important locations to preserve:**
- Make sure ALL existing location blocks are still there
- Don't modify any existing proxy_pass lines
- Just ADD the new `/pms-screener` block

**Test nginx config BEFORE reloading:**
```bash
# Test configuration
sudo nginx -t
```

**If test is successful:**
```bash
# Reload nginx (no downtime)
sudo systemctl reload nginx
```

**If test fails:**
```bash
# Restore backup
sudo cp /etc/nginx/sites-enabled/combined.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-enabled/combined
sudo nginx -t
```

---

### Step 8: Verify Deployment

```bash
# Check if service is running
sudo systemctl status fundscreener

# Check logs
sudo journalctl -u fundscreener -n 50 --no-pager

# Check if port 8004 is listening
sudo netstat -tlnp | grep 8004

# Test direct access to app
curl http://127.0.0.1:8004/api/health
```

---

### Step 9: Access Your Application

**Public URL:** http://82.25.105.18/pms-screener/

**Health Check:** http://82.25.105.18/pms-screener/api/health

---

## 🔍 Troubleshooting

### Service won't start
```bash
# Check detailed logs
sudo journalctl -u fundscreener -n 100 --no-pager

# Check if port is already in use
sudo netstat -tlnp | grep 8004

# Check permissions
ls -la /var/www/fundscreener
```

### Nginx errors
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify nginx config syntax
sudo nginx -t

# Restart nginx if needed
sudo systemctl restart nginx
```

### Can't access via browser
1. Check firewall:
```bash
sudo ufw status
sudo ufw allow 80/tcp
```

2. Check if nginx is running:
```bash
sudo systemctl status nginx
```

3. Check if fundscreener service is running:
```bash
sudo systemctl status fundscreener
```

---

## 🔄 Future Updates

To update the application:
```bash
# SSH into VPS
ssh root@82.25.105.18

# Navigate to app directory
cd /var/www/fundscreener

# Pull latest changes
git pull origin main

# Restart service
sudo systemctl restart fundscreener

# Verify it's running
sudo systemctl status fundscreener
```

---

## 📊 Post-Deployment Verification

✅ Service running: `sudo systemctl status fundscreener`  
✅ Port listening: `sudo netstat -tlnp | grep 8004`  
✅ Health check: `curl http://127.0.0.1:8004/api/health`  
✅ Nginx config valid: `sudo nginx -t`  
✅ Public access: http://82.25.105.18/pms-screener/  
✅ Existing projects untouched: Test all existing URLs

---

## 🎯 Summary

- **GitHub Repo:** https://github.com/Manideepgadi1/fundscreener
- **Server Path:** /var/www/fundscreener
- **Service Port:** 8004 (internal)
- **Public URL:** http://82.25.105.18/pms-screener/
- **Systemd Service:** fundscreener.service
- **Python:** 3.x with virtual environment
- **Web Server:** Nginx reverse proxy
- **App Server:** Gunicorn with 4 workers

---

## ⚡ Quick Command Reference

```bash
# Check service status
sudo systemctl status fundscreener

# View live logs
sudo journalctl -u fundscreener -f

# Restart service
sudo systemctl restart fundscreener

# Update from git
cd /var/www/fundscreener && git pull && sudo systemctl restart fundscreener

# Check nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

✅ **Deployment Complete!** Your PMS Screener is now accessible at `/pms-screener` path without affecting any existing projects.
