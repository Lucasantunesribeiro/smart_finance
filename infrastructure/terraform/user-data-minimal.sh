#!/bin/bash

# SmartFinance Minimal Setup Script
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting minimal SmartFinance setup at $(date)"

# Update system
apt-get update -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git and other tools
apt-get install -y git curl

# Start Docker
systemctl enable docker
systemctl start docker

# Wait for Docker
sleep 30

# Create a simple test web server
mkdir -p /opt/smartfinance
cd /opt/smartfinance

# Create a simple HTML page
cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>SmartFinance - Deployment Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { color: #28a745; font-weight: bold; }
        .info { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏦 SmartFinance</h1>
        <p class="status">✅ AWS EC2 Deployment Successful!</p>
        
        <div class="info">
            <h3>📊 System Status</h3>
            <p><strong>Server:</strong> AWS EC2 t3.micro</p>
            <p><strong>OS:</strong> Ubuntu 22.04 LTS</p>
            <p><strong>Docker:</strong> Installed and Running</p>
            <p><strong>Status:</strong> Ready for Application Deployment</p>
        </div>
        
        <div class="info">
            <h3>🚀 Next Steps</h3>
            <p>1. Application containers are being prepared</p>
            <p>2. Database services are initializing</p>
            <p>3. Full application will be available shortly</p>
        </div>
        
        <div class="info">
            <h3>🌐 Service URLs (when ready)</h3>
            <p><strong>Frontend:</strong> http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)</p>
            <p><strong>Backend API:</strong> http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5000</p>
            <p><strong>Payment Service:</strong> http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001</p>
        </div>
    </div>
</body>
</html>
EOF

# Start a simple web server
python3 -m http.server 80 &

# Clone the repository in background
git clone https://github.com/lucasantunesribeiro/smart_finance.git app &

# Create status file
echo "SmartFinance minimal setup completed at $(date)" > /opt/smartfinance/setup-status.txt
echo "Web server started on port 80" >> /opt/smartfinance/setup-status.txt

echo "Minimal setup completed at $(date)"