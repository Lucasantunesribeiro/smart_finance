# 🚀 SmartFinance Deployment Guide

## Quick Start (Local/Development)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Git

### 1. Clone and Deploy
```bash
git clone https://github.com/lucasantunesribeiro/smart_finance.git
cd smart_finance
./deploy.sh
```

### 2. Access Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000
- **Payment Service**: http://localhost:3001
- **API Documentation**: http://localhost:5000/swagger

---

## AWS EC2 Production Deployment

### Prerequisites
- AWS CLI configured
- Terraform installed
- SSH key pair

### 1. Automated AWS Deployment
```bash
# Run the complete AWS deployment script
./scripts/deploy-aws.sh
```

This script will:
- ✅ Check prerequisites
- 🔑 Generate SSH keys
- 🏗️ Deploy infrastructure with Terraform
- 📦 Deploy application to EC2
- 🔍 Perform health checks

### 2. Manual AWS Deployment

#### Step 1: Infrastructure Setup
```bash
cd infrastructure/terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings

# Deploy infrastructure
terraform init
terraform plan
terraform apply
```

#### Step 2: Application Deployment
```bash
# Get instance IP from Terraform output
INSTANCE_IP=$(terraform output -raw instance_public_ip)

# Copy application to instance
scp -r . ubuntu@$INSTANCE_IP:/opt/smartfinance/

# SSH to instance and deploy
ssh ubuntu@$INSTANCE_IP
cd /opt/smartfinance
./deploy.sh
```

---

## Production Configuration

### Environment Variables
```bash
# Copy template and configure
cp .env.example .env.production

# Generate secure passwords
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25  # For SQL_PASSWORD
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25  # For MONGO_PASSWORD
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25  # For REDIS_PASSWORD
openssl rand -base64 32                              # For JWT_SECRET
```

### SSL Certificate Setup
```bash
# Install SSL certificate (Let's Encrypt)
./nginx/ssl/ssl-setup.sh yourdomain.com admin@yourdomain.com
```

### Monitoring Setup
```bash
# Setup monitoring and backups
./scripts/setup-production.sh
```

---

## Service Management

### Docker Compose Commands
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# View service status
docker-compose -f docker-compose.prod.yml ps
```

### Health Checks
```bash
# Run health check script
./scripts/health/health-check.sh

# Manual health checks
curl http://localhost:3000          # Frontend
curl http://localhost:5000/health   # Backend
curl http://localhost:3001/health   # Payment Service
```

---

## Backup and Maintenance

### Database Backups
```bash
# Setup automated daily backups
./scripts/backup/setup-cron.sh

# Manual backup
./scripts/backup/backup-databases.sh
```

### Updates and Maintenance
```bash
# Pull latest changes and redeploy
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

# View system resources
docker stats

# Clean up unused images
docker system prune -a
```

---

## Security Checklist

### ✅ Pre-Production Security
- [ ] Change all default passwords
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable fail2ban for SSH protection
- [ ] Configure rate limiting
- [ ] Set up monitoring alerts
- [ ] Enable audit logging
- [ ] Configure backup encryption

### ✅ Network Security
- [ ] Use HTTPS only
- [ ] Configure CORS properly
- [ ] Set security headers
- [ ] Enable rate limiting
- [ ] Use strong JWT secrets

### ✅ Database Security
- [ ] Use strong database passwords
- [ ] Enable database encryption
- [ ] Configure database firewall
- [ ] Regular security updates
- [ ] Backup encryption

---

## Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Check system resources
docker stats
free -h
df -h
```

#### Database Connection Issues
```bash
# Check database containers
docker-compose -f docker-compose.prod.yml ps

# Test database connections
docker exec smartfinance-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SQL_PASSWORD" -Q "SELECT 1"
docker exec smartfinance-mongodb mongo --eval "db.adminCommand('ismaster')"
docker exec smartfinance-redis redis-cli ping
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Optimize database
# Run database maintenance scripts
```

### Getting Help
- Check application logs: `docker-compose logs -f`
- Review health check results: `./scripts/health/health-check.sh`
- Monitor system resources: `docker stats`
- Check network connectivity: `curl -I http://localhost`

---

## Production URLs

After successful deployment, your SmartFinance application will be available at:

- **🌐 Main Application**: `http://your-server-ip`
- **🔧 Backend API**: `http://your-server-ip:5000`
- **💳 Payment Service**: `http://your-server-ip:3001`
- **📊 API Documentation**: `http://your-server-ip:5000/swagger`

For AWS deployment, the IP address will be provided in the Terraform output.

---

## Support

For deployment issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Verify all prerequisites are met
4. Ensure all environment variables are properly configured

**🎉 Your SmartFinance application is now ready for production use!**