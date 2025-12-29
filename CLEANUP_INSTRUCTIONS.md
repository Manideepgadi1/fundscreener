# Quick Cleanup & Update Instructions

## What This Does:
1. ✅ Removes old duplicate PMS Screener folders (`/var/www/vsfintech/fundscreener` and `/var/www/pmsscreener`)
2. ✅ Keeps only `/var/www/fundscreener` (the current working one)
3. ✅ Updates the code with fixed "PMS Screener" name (no more "Screnner" typo)
4. ✅ Restarts the service

## Steps to Run on Your VPS:

### Option 1: Automatic (Recommended)
```bash
# SSH into your VPS
ssh root@82.25.105.18

# Navigate to the project
cd /var/www/fundscreener

# Pull the latest code (includes the cleanup script)
git pull origin main

# Make the script executable
chmod +x vps-cleanup-update.sh

# Run the cleanup and update script
./vps-cleanup-update.sh
```

### Option 2: Manual Steps
```bash
# SSH into your VPS
ssh root@82.25.105.18

# Remove old folders
rm -rf /var/www/vsfintech/fundscreener
rm -rf /var/www/pmsscreener

# Update current deployment
cd /var/www/fundscreener
git pull origin main
systemctl restart fundscreener

# Verify
systemctl status fundscreener
curl http://localhost:8004/api/health
```

## After Running:
- ✅ All old/duplicate folders removed
- ✅ Only `/var/www/fundscreener` remains
- ✅ App name fixed to "PMS Screener" everywhere
- ✅ Service restarted with latest code
- ✅ Accessible at: http://82.25.105.18/tools/pms-screener

## What Was Fixed:
- ❌ "PMS Screnner" (typo) → ✅ "PMS Screener" (correct)
- Changed in: config.py, DEPLOYMENT.md, README.md
