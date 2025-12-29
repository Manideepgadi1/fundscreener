#!/bin/bash
# VPS Cleanup and Update Script for PMS Screener
# This script removes old/duplicate folders and updates the current deployment

echo "========================================="
echo "PMS Screener - Cleanup & Update Script"
echo "========================================="
echo ""

# Step 1: Remove old duplicate folders
echo "Step 1: Removing old duplicate PMS Screener folders..."

if [ -d "/var/www/vsfintech/fundscreener" ]; then
    echo "  - Removing /var/www/vsfintech/fundscreener (old location)"
    rm -rf /var/www/vsfintech/fundscreener
    echo "    ✓ Removed"
else
    echo "    ✓ /var/www/vsfintech/fundscreener not found (already clean)"
fi

if [ -d "/var/www/pmsscreener" ]; then
    echo "  - Removing /var/www/pmsscreener (incomplete installation)"
    rm -rf /var/www/pmsscreener
    echo "    ✓ Removed"
else
    echo "    ✓ /var/www/pmsscreener not found (already clean)"
fi

echo ""

# Step 2: Update the current deployment
echo "Step 2: Updating /var/www/fundscreener with latest code..."
cd /var/www/fundscreener

echo "  - Pulling latest changes from GitHub..."
git pull origin main

echo "  - Restarting fundscreener service..."
systemctl restart fundscreener

sleep 2

echo "  - Checking service status..."
if systemctl is-active --quiet fundscreener; then
    echo "    ✓ Service is running"
else
    echo "    ✗ Service failed to start! Check logs with: journalctl -u fundscreener -n 50"
    exit 1
fi

echo ""

# Step 3: Verification
echo "Step 3: Verification..."
echo "  - Testing health endpoint..."
HEALTH_CHECK=$(curl -s http://localhost:8004/api/health | jq -r '.status' 2>/dev/null || echo "unknown")

if [ "$HEALTH_CHECK" = "healthy" ]; then
    echo "    ✓ Health check passed"
else
    echo "    ✗ Health check failed"
fi

echo ""
echo "========================================="
echo "Cleanup and Update Complete!"
echo "========================================="
echo ""
echo "Current Status:"
echo "  - Location: /var/www/fundscreener"
echo "  - Service: fundscreener.service (port 8004)"
echo "  - URL: http://82.25.105.18/tools/pms-screener"
echo ""
echo "Old folders removed:"
echo "  - /var/www/vsfintech/fundscreener"
echo "  - /var/www/pmsscreener"
echo ""
