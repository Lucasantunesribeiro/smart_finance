# 🚀 SmartFinance Production Deployment Guide

## 📋 Overview

This guide documents the complete production deployment of SmartFinance on AWS EC2 with zero-cost configuration and optimized resource usage.

## 🏗️ Production Architecture

### Current Deployment
- **Instance**: EC2 t3.micro (Free Tier)
- **IP Address**: 34.203.238.219
- **Region**: us-east-1
- **Instance ID**: i-05b508f552275eea6

### Services Running
```
┌─────────────────────────────────────────┐
│           AWS EC2 t3.micro              │
│  ┌─────────────────────────────────────┐ │
│  │        Docker Environment           │ │
│  │  ┌──────────────┐ ┌──────────────┐ │ │
│  │  │   Nginx      │ │   MongoDB    │ │ │
│  │  │  (30MB)      │ │  (250MB)     │ │ │
│  │  │  Port 80     │ │  Port 27017  │ │ │
│  │  └──────────────┘ └──────────────┘ │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 💰 Cost Optimization

### Zero-Cost Configuration
- ✅ **EC2**: t3.micro (750 hours/month free)
- ✅ **EBS**: 8GB (30GB free tier)
- ✅ **Data Transfer**: <15GB/month
- ✅ **No RDS, Load Balancers, or paid services**

### Resource Limits
- **Total Memory**: 940MB available
- **MongoDB**: 250MB limit (26% of total)
- **Nginx**: 30MB limit (3% of total)
- **System**: ~150MB (16% of total)
- **Available**: ~500MB (53% of total)

## 🔧 Deployment Procedures

### Initial Setup
```bash
# 1. Connect to EC2
ssh -i smartfinance-keypair.pem ec2-user@34.203.238.219

# 2. Navigate to project directory
cd /opt/smartfinance/smart_finance

# 3. Start services
docker-compose -f docker-compose.simple.yml up -d

# 4. Verify status
docker ps
docker stats --no-stream
```

### Service Management
```bash
# Start all services
docker-compose -f docker-compose.simple.yml up -d

# Stop all services
docker-compose -f docker-compose.simple.yml down

# Restart specific service
docker restart smartfinance-mongodb
docker restart smartfinance-status

# View logs
docker logs smartfinance-mongodb
docker logs smartfinance-status

# Check resource usage
docker stats --no-stream
free -h
```

## 📊 Monitoring and Maintenance

### Automated Monitoring
The system includes automated monitoring via PowerShell script:

```powershell
# Check system status
.\monitoring-system.ps1 -Status

# Install monitoring service
.\monitoring-system.ps1 -Install

# Emergency shutdown
.\monitoring-system.ps1 -Emergency
```

### Health Checks
- **Frontend**: http://34.203.238.219 (Status: 200 OK)
- **MongoDB**: Internal health check via Docker
- **System Memory**: Monitor usage <80%
- **AWS Costs**: Automated hourly checks

### Manual Health Check
```bash
# Check container status
docker ps

# Test MongoDB connection
docker exec smartfinance-mongodb mongosh --eval 'db.adminCommand("ping")'

# Check system resources
free -h
df -h

# Test web service
curl -I http://localhost
```

## 🔒 Security Configuration

### Firewall Rules
```bash
# Basic firewall configuration
sudo iptables -F
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

### File Permissions
```bash
# Secure environment files
chmod 600 /opt/smartfinance/smart_finance/.env*
chmod 644 /opt/smartfinance/smart_finance/docker-compose*.yml
```

### Security Groups (AWS)
- **SSH (22)**: 0.0.0.0/0
- **HTTP (80)**: 0.0.0.0/0
- **HTTPS (443)**: 0.0.0.0/0

## 🚨 Emergency Procedures

### Cost Alert Response
If AWS costs are detected:
1. **Immediate**: Run emergency shutdown
2. **Investigate**: Check AWS billing dashboard
3. **Terminate**: Any non-free tier resources
4. **Restart**: Only essential services

### Service Failure Response
If services fail:
1. **Check logs**: `docker logs <container-name>`
2. **Restart container**: `docker restart <container-name>`
3. **Full restart**: `docker-compose down && docker-compose up -d`
4. **Check resources**: `free -h` and `docker stats`

### Memory Issues
If memory usage >90%:
1. **Stop non-essential containers**
2. **Clear Docker cache**: `docker system prune -f`
3. **Restart services with limits**
4. **Monitor usage**: `watch free -h`

## 📈 Performance Optimization

### Container Limits
```yaml
# docker-compose.simple.yml
services:
  mongodb:
    mem_limit: 250m
    memswap_limit: 250m
    command: mongod --wiredTigerCacheSizeGB 0.25 --quiet --logpath /dev/null --nojournal
  
  status:
    mem_limit: 30m
    memswap_limit: 30m
```

### System Optimization
```bash
# Enable swap if needed
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Add to /etc/fstab for persistence
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 🔄 Backup and Recovery

### Data Backup
```bash
# Backup MongoDB data
docker exec smartfinance-mongodb mongodump --out /tmp/backup
docker cp smartfinance-mongodb:/tmp/backup ./mongodb-backup-$(date +%Y%m%d)

# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz docker-compose*.yml .env*
```

### Recovery Procedures
```bash
# Restore MongoDB data
docker cp ./mongodb-backup-YYYYMMDD smartfinance-mongodb:/tmp/restore
docker exec smartfinance-mongodb mongorestore /tmp/restore

# Restore configuration
tar -xzf config-backup-YYYYMMDD.tar.gz
docker-compose -f docker-compose.simple.yml up -d
```

## 📞 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker logs <container-name>

# Check available memory
free -h

# Remove and recreate
docker rm <container-name>
docker-compose up -d
```

#### High Memory Usage
```bash
# Check container usage
docker stats --no-stream

# Restart containers with limits
docker-compose down
docker-compose -f docker-compose.simple.yml up -d
```

#### Network Connectivity Issues
```bash
# Check container networking
docker network ls
docker network inspect smartfinance-network

# Restart networking
docker-compose down
docker network prune -f
docker-compose up -d
```

#### MongoDB Issues
```bash
# Check MongoDB logs
docker logs smartfinance-mongodb

# Connect to MongoDB
docker exec -it smartfinance-mongodb mongosh

# Restart with proper cache size
docker restart smartfinance-mongodb
```

## 📋 Maintenance Schedule

### Daily
- ✅ Automated health checks (every 5 minutes)
- ✅ Cost monitoring (hourly)
- ✅ Resource usage monitoring

### Weekly
- 🔍 Review logs for errors
- 📊 Check resource usage trends
- 🧹 Clean up Docker images: `docker system prune -f`

### Monthly
- 💰 Review AWS billing
- 🔄 Update system packages
- 📦 Backup configuration files
- 🔒 Review security settings

## 🎯 Success Metrics

### Performance Targets
- **Uptime**: >99%
- **Memory Usage**: <80%
- **Response Time**: <2 seconds
- **Cost**: $0.00/month

### Current Status
- ✅ **Zero AWS costs achieved**
- ✅ **All services running optimally**
- ✅ **Memory usage within limits**
- ✅ **Automated monitoring active**

## 📚 Additional Resources

### Useful Commands
```bash
# System information
uname -a
cat /proc/meminfo
cat /proc/cpuinfo

# Docker management
docker system df
docker image ls
docker volume ls

# AWS CLI
aws ec2 describe-instances --region us-east-1
aws ce get-cost-and-usage --time-period Start=2025-08-01,End=2025-08-31 --granularity MONTHLY --metrics BlendedCost
```

### Configuration Files
- `docker-compose.simple.yml`: Production container configuration
- `.env.production`: Environment variables
- `monitoring-system.ps1`: Monitoring and cost protection
- `cost-monitor.ps1`: Basic cost monitoring

---

**Last Updated**: August 16, 2025  
**Deployment Status**: ✅ Production Ready  
**Cost Status**: ✅ $0.00/month  
**Instance**: i-05b508f552275eea6 (34.203.238.219)