#!/bin/bash

# SmartFinance Quick Deploy Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SmartFinance Quick Deploy${NC}"
echo "============================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed.${NC}"
    exit 1
fi

# Create production environment if it doesn't exist
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚙️ Creating production environment file...${NC}"
    
    # Generate secure passwords
    SQL_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    MONGO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > .env.production << EOF
# SmartFinance Production Environment Variables
NODE_ENV=production
ASPNETCORE_ENVIRONMENT=Production

# Database Passwords (Auto-generated)
SQL_PASSWORD=${SQL_PASSWORD}
MONGO_PASSWORD=${MONGO_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_ISSUER=SmartFinance
JWT_AUDIENCE=SmartFinanceUsers

# Service URLs
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SIGNALR_URL=/financehub
NEXT_PUBLIC_PAYMENT_SERVICE_URL=/payment

# Database Connections
ConnectionStrings__DefaultConnection=Data Source=smartfinance.db
ConnectionStrings__RedisConnection=redis:6379,password=\${REDIS_PASSWORD}
ConnectionStrings__MongoConnection=mongodb://admin:\${MONGO_PASSWORD}@mongodb:27017/smartfinance_logs?authSource=admin
EOF

    echo -e "${GREEN}✅ Production environment created${NC}"
fi

# Stop any running containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down -v || true

# Build and start services
echo -e "${YELLOW}🏗️ Building and starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 60

# Health checks
echo -e "${YELLOW}🔍 Performing health checks...${NC}"

# Check if services are responding
FRONTEND_OK=false
BACKEND_OK=false
PAYMENT_OK=false

for i in {1..10}; do
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        FRONTEND_OK=true
        echo -e "${GREEN}✅ Frontend: OK${NC}"
        break
    fi
    echo "Checking frontend... ($i/10)"
    sleep 5
done

for i in {1..10}; do
    if curl -f -s http://localhost:5000/health > /dev/null 2>&1; then
        BACKEND_OK=true
        echo -e "${GREEN}✅ Backend API: OK${NC}"
        break
    fi
    echo "Checking backend... ($i/10)"
    sleep 5
done

for i in {1..10}; do
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        PAYMENT_OK=true
        echo -e "${GREEN}✅ Payment Service: OK${NC}"
        break
    fi
    echo "Checking payment service... ($i/10)"
    sleep 5
done

# Show deployment status
echo ""
echo -e "${BLUE}📊 Deployment Status${NC}"
echo "===================="

if [ "$FRONTEND_OK" = true ]; then
    echo -e "${GREEN}✅ Frontend: Running${NC}"
else
    echo -e "${RED}❌ Frontend: Failed${NC}"
fi

if [ "$BACKEND_OK" = true ]; then
    echo -e "${GREEN}✅ Backend API: Running${NC}"
else
    echo -e "${RED}❌ Backend API: Failed${NC}"
fi

if [ "$PAYMENT_OK" = true ]; then
    echo -e "${GREEN}✅ Payment Service: Running${NC}"
else
    echo -e "${RED}❌ Payment Service: Failed${NC}"
fi

# Show container status
echo ""
echo -e "${BLUE}🐳 Container Status${NC}"
echo "==================="
docker-compose -f docker-compose.prod.yml ps

# Show access URLs
echo ""
echo -e "${GREEN}🎉 SmartFinance Deployment Complete!${NC}"
echo "====================================="
echo -e "${BLUE}🌐 Application: http://localhost${NC}"
echo -e "${BLUE}🔧 Backend API: http://localhost:5000${NC}"
echo -e "${BLUE}💳 Payment Service: http://localhost:3001${NC}"
echo -e "${BLUE}📊 API Docs: http://localhost:5000/swagger${NC}"
echo ""
echo -e "${YELLOW}📝 Useful Commands:${NC}"
echo "View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "Stop services: docker-compose -f docker-compose.prod.yml down"
echo "Restart services: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo -e "${YELLOW}🔐 Security Note:${NC}"
echo "Secure passwords have been generated in .env.production"
echo "For production deployment, consider:"
echo "- Setting up SSL certificates"
echo "- Configuring firewall rules"
echo "- Setting up monitoring and backups"

# Check if all services are healthy
if [ "$FRONTEND_OK" = true ] && [ "$BACKEND_OK" = true ] && [ "$PAYMENT_OK" = true ]; then
    echo -e "${GREEN}🎊 All services are running successfully!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ Some services may need attention. Check logs for details.${NC}"
    echo "Run: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi