#!/bin/bash

# SmartFinance Simple Setup Script
# Log everything
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting SmartFinance setup at $(date)"

# Update system
apt-get update -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh || echo "Docker installation had issues, continuing..."
usermod -aG docker ubuntu || echo "User modification had issues, continuing..."

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || echo "Docker Compose download failed, continuing..."
chmod +x /usr/local/bin/docker-compose || echo "Docker Compose chmod failed, continuing..."

# Install Git
apt-get install -y git || echo "Git installation failed, continuing..."

# Start Docker service
systemctl enable docker || echo "Docker enable failed, continuing..."
systemctl start docker || echo "Docker start failed, continuing..."

# Wait for Docker to be ready
sleep 30

# Create application directory
mkdir -p /opt/smartfinance
chown ubuntu:ubuntu /opt/smartfinance || echo "Chown failed, continuing..."

# Clone the repository
cd /opt/smartfinance
git clone https://github.com/lucasantunesribeiro/smart_finance.git . || echo "Git clone failed, continuing..."

# Create production environment file
cat > .env.production << 'EOF'
NODE_ENV=production
ASPNETCORE_ENVIRONMENT=Production

SQL_PASSWORD=SmartFinance_SQL_2024!
MONGO_PASSWORD=SmartFinance_Mongo_2024!
REDIS_PASSWORD=SmartFinance_Redis_2024!

JWT_SECRET=SmartFinance_JWT_Secret_Key_2024_32_Chars_Long!
JWT_ISSUER=SmartFinance
JWT_AUDIENCE=SmartFinanceUsers

NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SIGNALR_URL=/financehub
NEXT_PUBLIC_PAYMENT_SERVICE_URL=/payment

ConnectionStrings__DefaultConnection=Data Source=smartfinance.db
ConnectionStrings__RedisConnection=redis:6379,password=SmartFinance_Redis_2024!
ConnectionStrings__MongoConnection=mongodb://admin:SmartFinance_Mongo_2024!@mongodb:27017/smartfinance_logs?authSource=admin
EOF

# Set permissions
chown -R ubuntu:ubuntu /opt/smartfinance || echo "Chown recursive failed, continuing..."

# Try to start the application
cd /opt/smartfinance
docker-compose -f docker-compose.prod.yml up -d --build || echo "Docker compose failed, continuing..."

# Create a simple status file
echo "SmartFinance setup completed at $(date)" > /opt/smartfinance/setup-status.txt
echo "Docker status:" >> /opt/smartfinance/setup-status.txt
systemctl status docker >> /opt/smartfinance/setup-status.txt 2>&1 || echo "Docker status check failed"

echo "SmartFinance setup script finished at $(date)"