# PMS Screener - Deployment Instructions

## 📋 Quick Deployment Guide

### Step 1: Push Changes to GitHub ✅ (Already Done!)
```bash
git add .
git commit -m "Update to PMS Screener"
git push origin main
```

### Step 2: Update Deployment on Server

Connect to your server and run these commands:

```bash
# SSH into the server
ssh user@82.25.105.18

# Download and run the deployment update script
cd /var/www/fundscreener
curl -O https://raw.githubusercontent.com/Manideepgadi1/fundscreener/main/deploy-update.sh
chmod +x deploy-update.sh
./deploy-update.sh
```

**Or manually:**

```bash
# Navigate to app directory
cd /var/www/fundscreener

# Pull latest changes
git pull origin main

# Restart service
sudo systemctl restart fundscreener

# Check status
sudo systemctl status fundscreener
```

### Step 3: Rename to PMS Screener (Optional)

If you want to rename the entire deployment from "fundscreener" to "pms-screener":

```bash
# Run the rename script
cd /var/www/fundscreener
curl -O https://raw.githubusercontent.com/Manideepgadi1/fundscreener/main/rename-to-pms.sh
chmod +x rename-to-pms.sh
sudo ./rename-to-pms.sh
```

This will:
- Rename `/var/www/fundscreener` → `/var/www/pms-screener`
- Rename service `fundscreener.service` → `pms-screener.service`
- Update nginx route `/fundscreener/` → `/pms-screener/`
- Update all configuration files

**New URL after rename:** `http://82.25.105.18/pms-screener/`

---

## 🔍 What Changed

### Code Updates:
1. ✅ **Display Name**: "Mutual Fund Screener" → "PMS Screener"
2. ✅ **Filter Focus Fix**: Inputs no longer lose focus when typing
3. ✅ **Numeric Filters**: Number filters now show values >= entered number
   - Example: Typing "3" in Returns 1 Yr shows only returns ≥ 3%

### Files Modified:
- `table.html` - Updated title and heading
- `table-script.js` - Fixed filter focus issue + numeric comparison logic

---

## 🧪 Testing After Deployment

```bash
# Test health endpoint
curl http://82.25.105.18/fundscreener/api/health

# Or if renamed:
curl http://82.25.105.18/pms-screener/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "app": "Fund Screener",
  "port": 8004,
  "records": 556,
  "columns": 45
}
```

---

## 📝 Manual Deployment Steps (Alternative)

If you prefer to do it manually:

1. **SSH into server:**
   ```bash
   ssh user@82.25.105.18
   ```

2. **Navigate to app directory:**
   ```bash
   cd /var/www/fundscreener
   ```

3. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

4. **Restart the service:**
   ```bash
   sudo systemctl restart fundscreener
   ```

5. **Verify it's running:**
   ```bash
   sudo systemctl status fundscreener
   curl http://localhost:8004/api/health
   ```

6. **Check logs if needed:**
   ```bash
   sudo journalctl -u fundscreener -f
   ```

---

## ⚠️ Important Notes

- The display name is already changed to "PMS Screener" in the UI
- You can keep the URL as `/fundscreener/` if you prefer (just the display changes)
- Only run `rename-to-pms.sh` if you want to change the entire deployment path
- The rename script requires sudo privileges

---

## 🆘 Troubleshooting

**Service won't start:**
```bash
sudo journalctl -u fundscreener -n 50 --no-pager
```

**Permission issues:**
```bash
sudo chown -R www-data:www-data /var/www/fundscreener
```

**Port already in use:**
```bash
sudo lsof -i :8004
```

**Nginx issues:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```
