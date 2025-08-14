#!/bin/bash

# SmartFinance EC2 User Data Script
set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
apt-get install -y git

# Install Node.js (for deployment scripts)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install .NET SDK (for backend builds)
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
apt-get update -y
apt-get install -y dotnet-sdk-8.0

# Create application directory
mkdir -p /opt/smartfinance
chown ubuntu:ubuntu /opt/smartfinance

# Create systemd service for SmartFinance
cat > /etc/systemd/system/smartfinance.service << 'EOF'
[Unit]
Description=SmartFinance Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/smartfinance
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d --build
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
systemctl enable smartfinance.service

# Create deployment script
cat > /opt/smartfinance/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting SmartFinance deployment..."

# Pull latest changes
git pull origin main

# Build and start services
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🔍 Performing health checks..."
curl -f http://localhost:5000/health || echo "❌ Backend health check failed"
curl -f http://localhost:3000 || echo "❌ Frontend health check failed"
curl -f http://localhost:3001/health || echo "❌ Payment service health check failed"

echo "✅ SmartFinance deployment completed!"
EOF

chmod +x /opt/smartfinance/deploy.sh
chown ubuntu:ubuntu /opt/smartfinance/deploy.sh

# Create log directory
mkdir -p /var/log/smartfinance
chown ubuntu:ubuntu /var/log/smartfinance

echo "✅ EC2 instance setup completed!"