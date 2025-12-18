#!/bin/bash
# Deployment Script for PMS Screener Update
# Run this on the server: 82.25.105.18

set -e  # Exit on error

echo "🚀 Starting PMS Screener Deployment Update..."
echo "================================================"

# Navigate to application directory
cd /var/www/fundscreener

# Pull latest changes from GitHub
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Restart the service
echo "🔄 Restarting fundscreener service..."
sudo systemctl restart fundscreener

# Check service status
echo "✅ Checking service status..."
sudo systemctl status fundscreener --no-pager

# Test the application
echo "🧪 Testing application..."
sleep 2
curl -s http://localhost:8004/api/health | python3 -m json.tool

echo ""
echo "================================================"
echo "✅ Deployment Update Complete!"
echo "🌐 Application URL: http://82.25.105.18/fundscreener/"
echo ""
echo "📝 Next Steps (Optional - to rename fundscreener to pms-screener):"
echo "   Run: bash rename-to-pms.sh"
echo "================================================"
