#!/bin/bash

# SmartFinance EC2 User Data Script
# This script runs on first boot to set up the environment

set -e

# Logging
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "🚀 Starting SmartFinance server setup..."
echo "📅 Setup started at: $(date)"

# Update system
echo "📦 Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    ufw \
    fail2ban \
    logrotate \
    ca-certificates \
    gnupg \
    lsb-release

# Configure firewall
echo "🔒 Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow http
ufw allow https

# Configure fail2ban for SSH protection
echo "🛡️  Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Docker Compose (standalone)
echo "🔧 Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="2.24.0"
curl -L "https://github.com/docker/compose/releases/download/v$${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/smartfinance
chown ubuntu:ubuntu /opt/smartfinance

# Create swap file for additional memory (important for t2.micro)
echo "💾 Creating swap file..."
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Configure system for better performance with limited resources
echo "⚡ Optimizing system performance..."

# Reduce swappiness (use swap less aggressively)
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Configure Docker daemon for resource optimization
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

# Restart Docker with new configuration
systemctl restart docker

# Install monitoring tools
echo "📊 Installing monitoring tools..."
apt-get install -y htop iotop nethogs

# Create deployment user and setup SSH
echo "👤 Setting up deployment configuration..."
mkdir -p /home/ubuntu/.ssh
chown ubuntu:ubuntu /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh

# Create deployment script
cat > /opt/smartfinance/deploy.sh << 'EOF'
#!/bin/bash

# SmartFinance Deployment Script
set -e

echo "🚀 Starting SmartFinance deployment..."

# Navigate to application directory
cd /opt/smartfinance

# Pull latest changes (if git repo exists)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes..."
    git pull origin main
else
    echo "ℹ️  No git repository found, skipping pull"
fi

# Load environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose -f docker-compose.prod.yml down || true

# Remove unused Docker resources
echo "🧹 Cleaning up Docker resources..."
docker system prune -f

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed successfully!"
EOF

chmod +x /opt/smartfinance/deploy.sh
chown ubuntu:ubuntu /opt/smartfinance/deploy.sh

# Create health check script
cat > /opt/smartfinance/health-check.sh << 'EOF'
#!/bin/bash

# SmartFinance Health Check Script
echo "🏥 SmartFinance Health Check - $(date)"

# Check if Docker is running
if ! systemctl is-active --quiet docker; then
    echo "❌ Docker is not running"
    exit 1
fi

# Check Docker Compose services
cd /opt/smartfinance
if [ -f "docker-compose.prod.yml" ]; then
    echo "📊 Service Status:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo ""
    echo "🔍 Health Checks:"
    
    # Check nginx
    if curl -f -s http://localhost/health > /dev/null; then
        echo "✅ Nginx: Healthy"
    else
        echo "❌ Nginx: Unhealthy"
    fi
    
    # Check backend API
    if curl -f -s http://localhost/api/v1/health > /dev/null; then
        echo "✅ Backend API: Healthy"
    else
        echo "❌ Backend API: Unhealthy"
    fi
    
    # Check payment service
    if curl -f -s http://localhost/payment/health > /dev/null; then
        echo "✅ Payment Service: Healthy"
    else
        echo "❌ Payment Service: Unhealthy"
    fi
    
    echo ""
    echo "💾 System Resources:"
    echo "Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
    echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
else
    echo "❌ docker-compose.prod.yml not found"
    exit 1
fi
EOF

chmod +x /opt/smartfinance/health-check.sh
chown ubuntu:ubuntu /opt/smartfinance/health-check.sh

# Setup log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/smartfinance << 'EOF'
/opt/smartfinance/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
EOF

# Create logs directory
mkdir -p /opt/smartfinance/logs
chown ubuntu:ubuntu /opt/smartfinance/logs

# Setup cron job for health checks
echo "⏰ Setting up health check cron job..."
(crontab -u ubuntu -l 2>/dev/null; echo "*/5 * * * * /opt/smartfinance/health-check.sh >> /opt/smartfinance/logs/health-check.log 2>&1") | crontab -u ubuntu -

# Final system optimization
echo "🎯 Final system optimization..."
sysctl -p

# Create welcome message
cat > /etc/motd << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                            🏦 SmartFinance Server                            ║
║                         Production Environment Ready                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  📁 Application Directory: /opt/smartfinance                                 ║
║  🚀 Deploy Command:       /opt/smartfinance/deploy.sh                       ║
║  🏥 Health Check:         /opt/smartfinance/health-check.sh                 ║
║  📊 Monitor Services:     docker-compose -f docker-compose.prod.yml ps      ║
║  📝 View Logs:           docker-compose -f docker-compose.prod.yml logs -f  ║
║                                                                              ║
║  🔧 System Commands:                                                         ║
║    • htop              - System resource monitor                            ║
║    • docker stats      - Container resource usage                           ║
║    • free -h           - Memory usage                                       ║
║    • df -h             - Disk usage                                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF

echo "✅ SmartFinance server setup completed successfully!"
echo "📅 Setup completed at: $(date)"
echo "🎯 Server is ready for application deployment"

# Reboot to ensure all changes take effect
echo "🔄 Rebooting system to apply all changes..."
reboot