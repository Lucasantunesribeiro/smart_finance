#!/bin/bash
# Quick Deploy for SmartFinance - Execute on server
set -e

echo "🚀 SmartFinance Quick Deploy Started"
cd /home/ec2-user

# Stop existing services
sudo docker-compose -f SmartFinance/docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Update repository  
cd SmartFinance 2>/dev/null || git clone https://github.com/Lucasantunesribeiro/smart_finance.git SmartFinance && cd SmartFinance
git fetch origin && git reset --hard origin/main

# Start services
sudo docker-compose -f docker-compose.prod.yml up -d --build

echo "✅ Deploy completed! Services starting..."
sleep 60
sudo docker-compose -f docker-compose.prod.yml ps