#!/bin/bash

# GitHub Webhook Deploy Script for SmartFinance
# This script can be executed via SSH or webhook to update the application

set -e

echo "🚀 SmartFinance GitHub Deploy"
echo "============================"

# Configuration
REPO_URL="https://github.com/Lucasantunesribeiro/smart_finance.git"
APP_DIR="/home/ec2-user/SmartFinance"
BRANCH="main"

# Ensure we're in the right directory
cd /home/ec2-user

# Install required tools if missing
echo "📦 Checking dependencies..."
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    sudo yum install -y git
fi

if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Clone or update repository
if [ -d "$APP_DIR" ]; then
    echo "📁 Updating repository..."
    cd "$APP_DIR"
    sudo git fetch origin
    sudo git reset --hard origin/$BRANCH
    sudo git clean -fd
else
    echo "📥 Cloning repository..."
    sudo git clone $REPO_URL $APP_DIR
    cd "$APP_DIR"
fi

# Stop current services
echo "🛑 Stopping current services..."
sudo docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# Clean Docker resources to free space
echo "🧹 Cleaning Docker resources..."
sudo docker system prune -af || true

# Build and deploy
echo "🏗️  Building and deploying services..."

# Set correct ownership
sudo chown -R ec2-user:ec2-user $APP_DIR

# Start services
sudo docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services
echo "⏳ Waiting for services to start (120 seconds)..."
sleep 120

# Check status
echo "📊 Service Status:"
sudo docker-compose -f docker-compose.prod.yml ps

# Test endpoints
echo "🧪 Testing endpoints..."

echo "Frontend Health Check:"
if curl -f -s -m 10 "http://localhost:3000/api/health" | jq -r '.status' 2>/dev/null; then
    echo "✅ Frontend: Healthy"
else
    echo "⚠️  Frontend: Starting or issues"
fi

echo "Backend Health Check:"
if curl -f -s -m 10 "http://localhost:5000/api/v1/health" 2>/dev/null; then
    echo "✅ Backend: Healthy"
else
    echo "⚠️  Backend: Starting or issues"
fi

echo "Payment Service Health Check:"
if curl -f -s -m 10 "http://localhost:3001/payment/health" 2>/dev/null; then
    echo "✅ Payment Service: Healthy"
else
    echo "⚠️  Payment Service: Starting or issues"
fi

# Display recent logs
echo ""
echo "📋 Recent logs (last 10 lines):"
sudo docker-compose -f docker-compose.prod.yml logs --tail=10

echo ""
echo "🎉 Deploy completed!"
echo "📱 Access your application:"
echo "   🌐 Frontend: http://34.203.238.219:3000"
echo "   🔧 Backend API: http://34.203.238.219:5000/api/v1"  
echo "   💳 Payment API: http://34.203.238.219:3001/payment"
echo ""
echo "🔍 Useful commands:"
echo "   Logs: sudo docker-compose -f docker-compose.prod.yml logs -f"
echo "   Restart: sudo docker-compose -f docker-compose.prod.yml restart"
echo "   Status: sudo docker-compose -f docker-compose.prod.yml ps"

# Create a simple status endpoint
echo "📡 Creating status script..."
cat > /home/ec2-user/status.sh << 'EOF'
#!/bin/bash
echo "=== SmartFinance Status ==="
echo "Time: $(date)"
echo ""
echo "=== Docker Containers ==="
sudo docker-compose -f /home/ec2-user/SmartFinance/docker-compose.prod.yml ps
echo ""
echo "=== Service Health ==="
echo -n "Frontend: "
curl -s -m 5 "http://localhost:3000/api/health" | jq -r '.status' 2>/dev/null || echo "Not responding"
echo -n "Backend: "
curl -s -m 5 "http://localhost:5000/api/v1/health" >/dev/null 2>&1 && echo "Healthy" || echo "Not responding"
echo -n "Payment: "
curl -s -m 5 "http://localhost:3001/payment/health" >/dev/null 2>&1 && echo "Healthy" || echo "Not responding"
EOF

chmod +x /home/ec2-user/status.sh

echo ""
echo "✨ Deployment successful! Check /home/ec2-user/status.sh for quick status checks."