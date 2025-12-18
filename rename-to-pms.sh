#!/bin/bash
# Script to Rename fundscreener to pms-screener
# Run this on the server: 82.25.105.18 (AFTER deploy-update.sh)

set -e  # Exit on error

echo "🔄 Renaming fundscreener to pms-screener..."
echo "================================================"

# Stop the current service
echo "⏸️  Stopping fundscreener service..."
sudo systemctl stop fundscreener

# Rename application directory
echo "📁 Renaming application directory..."
sudo mv /var/www/fundscreener /var/www/pms-screener

# Update systemd service file
echo "⚙️  Updating systemd service configuration..."
sudo sed -i 's|/var/www/fundscreener|/var/www/pms-screener|g' /etc/systemd/system/fundscreener.service
sudo sed -i 's|Description=Fund Screener|Description=PMS Screener|g' /etc/systemd/system/fundscreener.service

# Rename service file
sudo mv /etc/systemd/system/fundscreener.service /etc/systemd/system/pms-screener.service

# Update nginx configuration
echo "🌐 Updating nginx configuration..."
sudo sed -i 's|location /fundscreener|location /pms-screener|g' /etc/nginx/sites-enabled/combined
sudo sed -i 's|alias /var/www/fundscreener|alias /var/www/pms-screener|g' /etc/nginx/sites-enabled/combined

# Reload systemd daemon
echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable and start the new service
echo "▶️  Starting pms-screener service..."
sudo systemctl enable pms-screener
sudo systemctl start pms-screener

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

# Check service status
echo "✅ Checking service status..."
sudo systemctl status pms-screener --no-pager

# Test the application
echo "🧪 Testing application..."
sleep 2
curl -s http://localhost:8004/api/health | python3 -m json.tool

echo ""
echo "================================================"
echo "✅ Rename Complete!"
echo ""
echo "🌐 New Application URL: http://82.25.105.18/pms-screener/"
echo "📊 API Health Check: http://82.25.105.18/pms-screener/api/health"
echo ""
echo "⚠️  Note: Update your bookmarks and links to use /pms-screener/"
echo "================================================"
