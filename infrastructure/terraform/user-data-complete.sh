#!/bin/bash

# SmartFinance Complete Setup Script
set -e

# Log everything
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting SmartFinance setup at $(date)"

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

# Create application directory
mkdir -p /opt/smartfinance
chown ubuntu:ubuntu /opt/smartfinance

# Clone the repository
cd /opt/smartfinance
git clone https://github.com/lucasantunesribeiro/smart_finance.git .

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
chown -R ubuntu:ubuntu /opt/smartfinance

# Start Docker service
systemctl enable docker
systemctl start docker

# Wait for Docker to be ready
sleep 10

# Build and start the application
cd /opt/smartfinance
docker-compose -f docker-compose.prod.yml up -d --build

# Create a simple health check script
cat > /opt/smartfinance/health-check.sh << 'EOF'
#!/bin/bash
echo "SmartFinance Health Check - $(date)"
echo "=================================="

# Check containers
echo "Container Status:"
docker-compose -f /opt/smartfinance/docker-compose.prod.yml ps

echo ""
echo "Service Health:"

# Check services
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: Failed"
fi

if curl -f -s http://localhost:5000/health > /dev/null; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: Failed"
fi

if curl -f -s http://localhost:3001/health > /dev/null; then
    echo "✅ Payment Service: OK"
else
    echo "❌ Payment Service: Failed"
fi
EOF

chmod +x /opt/smartfinance/health-check.sh

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

echo "SmartFinance setup completed at $(date)"
echo "Application should be available at:"
echo "- Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "- Backend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5000"
echo "- Payment Service: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001"