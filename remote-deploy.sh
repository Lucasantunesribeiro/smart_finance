#!/bin/bash

# Remote deployment script for SmartFinance
# This script will be executed remotely on the EC2 server

set -e

SERVER_IP="34.203.238.219"
REPO_URL="https://github.com/Lucasantunesribeiro/smart_finance.git"

echo "🚀 SmartFinance Remote Deployment Script"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo yum update -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker $USER
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🔧 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
    echo "📥 Installing Git..."
    sudo yum install -y git
fi

# Navigate to home directory
cd /home/ec2-user

# Clone or update repository
if [ -d "SmartFinance" ]; then
    echo "📁 Updating existing repository..."
    cd SmartFinance
    git fetch origin
    git reset --hard origin/main
else
    echo "📥 Cloning repository..."
    git clone $REPO_URL SmartFinance
    cd SmartFinance
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
sudo docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# Clean up Docker resources
echo "🧹 Cleaning up Docker resources..."
sudo docker system prune -f || true

# Set environment variables
echo "🔧 Setting up environment..."
export NEXT_PUBLIC_API_URL="http://34.203.238.219:5000/api/v1"
export NEXT_PUBLIC_PAYMENT_API_URL="http://34.203.238.219:3001/payment"

# Build and start services
echo "🏗️  Building and starting services..."
sudo docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 90

# Check service status
echo "📊 Checking service status..."
sudo docker-compose -f docker-compose.prod.yml ps

# Test endpoints
echo "🧪 Testing endpoints..."
sleep 30

echo "Testing Frontend Health..."
if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend may still be starting"
fi

echo "Testing Backend Health..."
if curl -f -s "http://localhost:5000/api/v1/health" > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend may still be starting"
fi

echo "Testing Payment Service Health..."
if curl -f -s "http://localhost:3001/payment/health" > /dev/null; then
    echo "✅ Payment Service is healthy"
else
    echo "⚠️  Payment Service may still be starting"
fi

# Show logs for debugging
echo "📋 Recent logs:"
sudo docker-compose -f docker-compose.prod.yml logs --tail=20

echo ""
echo "🎉 Deployment completed!"
echo "📱 Application URLs:"
echo "   Frontend: http://34.203.238.219:3000"
echo "   Backend: http://34.203.238.219:5000/api/v1"
echo "   Payment: http://34.203.238.219:3001/payment"
echo ""
echo "🔍 To check logs: sudo docker-compose -f docker-compose.prod.yml logs -f"
echo "🔄 To restart: sudo docker-compose -f docker-compose.prod.yml restart"