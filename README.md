# 📊 PMS Screener

Professional mutual fund screening and analysis tool with advanced filtering, sorting, and export capabilities.

## 🚀 Features

- **Advanced Filtering**: Search and filter across all 45+ data columns
- **Smart Sorting**: Click column headers to sort data
- **Column Selection**: Choose which columns to display
- **Resizable Columns**: Drag column edges to adjust width
- **Export to CSV**: Download filtered data
- **Mobile Responsive**: Works on desktop, tablet, and mobile
- **Real-time Search**: Filter data as you type
- **Pagination**: Handle large datasets efficiently

## 🛠️ Technology Stack

**Backend:**
- Python 3.11+
- Flask 3.0.0
- Pandas 2.1.4
- Gunicorn (production server)

**Frontend:**
- HTML5
- CSS3 (Flexbox, Grid)
- Vanilla JavaScript (ES6+)

## 📋 Prerequisites

- Python 3.11 or higher
- pip (Python package manager)
- Virtual environment support

## 🔧 Local Development Setup

1. **Clone the repository:**
```bash
git clone https://github.com/Manideepgadi1/fundscreener.git
cd fundscreener
```

2. **Create virtual environment:**
```bash
python -m venv venv
```

3. **Activate virtual environment:**

Windows:
```bash
venv\Scripts\activate
```

Linux/Mac:
```bash
source venv/bin/activate
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

5. **Run development server:**
```bash
python app.py
```

6. **Access the application:**
Open browser and go to: `http://localhost:8001`

## 🌐 Production Deployment on Hostinger VPS

### Step 1: Connect to VPS
```bash
ssh your-username@your-server-ip
```

### Step 2: Install System Dependencies
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip nginx git -y
```

### Step 3: Create Application Directory
```bash
sudo mkdir -p /var/www/fundscreener
sudo chown $USER:$USER /var/www/fundscreener
cd /var/www/fundscreener
```

### Step 4: Clone Repository
```bash
git clone https://github.com/Manideepgadi1/fundscreener.git .
```

### Step 5: Setup Virtual Environment
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 6: Configure Environment
```bash
cp .env.example .env
nano .env
```

Edit the `.env` file:
```
FLASK_CONFIG=production
FLASK_HOST=0.0.0.0
FLASK_PORT=8001
FLASK_DEBUG=False
CSV_FILE=FinExport_11-12-2025.csv
SECRET_KEY=your-random-secret-key-here
```

### Step 7: Test Application
```bash
python app.py
# Press Ctrl+C to stop after confirming it works
```

### Step 8: Setup Systemd Service
```bash
sudo cp fundscreener.service /etc/systemd/system/
sudo nano /etc/systemd/system/fundscreener.service
```

Update paths if needed, then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable fundscreener
sudo systemctl start fundscreener
sudo systemctl status fundscreener
```

### Step 9: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/fundscreener
```

Copy content from `nginx.conf` and update domain name.

```bash
sudo ln -s /etc/nginx/sites-available/fundscreener /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 10: Configure Firewall
```bash
sudo ufw allow 8001/tcp
sudo ufw allow 'Nginx Full'
sudo ufw status
```

### Step 11: SSL Certificate (Optional but Recommended)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d fundscreener.yourdomain.com
```

## 🔄 Updating the Application

```bash
cd /var/www/fundscreener
git pull origin main
source venv/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl restart fundscreener
```

## 📊 Monitoring & Logs

**View application logs:**
```bash
sudo journalctl -u fundscreener -f
```

**Check service status:**
```bash
sudo systemctl status fundscreener
```

**Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔒 Security Considerations

1. **Change SECRET_KEY** in `.env` to a random string
2. **Enable SSL** with Let's Encrypt
3. **Configure firewall** to allow only necessary ports
4. **Regular updates**: Keep system and packages updated
5. **Backup data**: Regular backups of CSV file
6. **Monitor logs**: Check for unusual activity

## 🌍 URL Access Options

**Option 1: Subdomain**
- URL: `http://fundscreener.yourdomain.com`
- Configure DNS A record pointing to your server IP

**Option 2: Path-based**
- URL: `http://yourdomain.com/fundscreener`
- Update nginx.conf to use location block

**Option 3: Port-based (Development Only)**
- URL: `http://your-ip:8001`
- Not recommended for production

## ⚙️ Configuration

### Port Configuration
The application runs on **port 8001** by default to avoid conflicts with other projects.

To change port:
1. Update `FLASK_PORT` in `.env`
2. Update port in `fundscreener.service`
3. Update port in `nginx.conf`
4. Restart services

### Adding New Data
1. Replace `FinExport_11-12-2025.csv` with your new CSV file
2. Update `CSV_FILE` in `.env` if filename changes
3. Restart application: `sudo systemctl restart fundscreener`

## 🐛 Troubleshooting

**Application won't start:**
```bash
sudo systemctl status fundscreener
sudo journalctl -u fundscreener -n 50
```

**Nginx errors:**
```bash
sudo nginx -t
sudo systemctl status nginx
```

**Port already in use:**
```bash
sudo lsof -i :8001
# Kill process or change port in configuration
```

**Permission issues:**
```bash
sudo chown -R www-data:www-data /var/www/fundscreener
sudo chmod -R 755 /var/www/fundscreener
```

## 📝 API Endpoints

- `GET /` - Main application page
- `GET /api/health` - Health check
- `GET /api/funds?page=1&per_page=10` - Get paginated funds data
- `GET /api/export` - Export data as CSV

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is private and proprietary.

## 📧 Support

For issues and questions, please contact the development team.

## 🔗 Important Notes

- **Port 8001** is dedicated for this application
- Application runs isolated from other projects
- Uses separate systemd service
- Separate Nginx configuration
- No interference with existing deployments
