# Design Document

## Overview

The SmartFinance Production Cleanup design focuses on creating a lean, cost-effective production deployment by systematically removing development artifacts, optimizing AWS resource usage, and implementing a streamlined EC2-based architecture. The solution emphasizes zero-cost operation within AWS free tier limits while maintaining full application functionality.

## Architecture

### Current State Analysis
- **Deployment**: EC2 instance (i-076e2d935f05ecb88) at IP 54.146.148.54
- **Instance Type**: t3.micro (free tier eligible)
- **Services**: MongoDB, Status page, potential backend services
- **Issues**: Multiple unnecessary files, potential cost-generating resources, unoptimized configurations

### Target Production Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    AWS EC2 t2.micro                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                Docker Environment                       ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   ││
│  │  │   Nginx      │ │   Backend    │ │   Payment    │   ││
│  │  │  (30MB)      │ │   (.NET)     │ │  (Node.js)   │   ││
│  │  │              │ │  (200MB)     │ │  (150MB)     │   ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘   ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   ││
│  │  │   Frontend   │ │   MongoDB    │ │    Redis     │   ││
│  │  │  (Next.js)   │ │  (250MB)     │ │   (64MB)     │   ││
│  │  │  (150MB)     │ │              │ │              │   ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### File Cleanup Strategy
**Development Files to Remove:**
- `/scripts/` - All PowerShell deployment scripts (25 files)
- `/aws-backup-*` - Backup directories and files
- `/*.pem` - SSH key files (keep only active one)
- `/*.ps1` - Root level PowerShell scripts
- `/*.sh` - Root level shell scripts
- `/docs/` - Development documentation
- `/.vscode/` - IDE configuration
- Multiple docker-compose files (keep only production)

**Files to Retain:**
- `/backend/` - .NET application source
- `/frontend/` - Next.js application source  
- `/microservice/` - Payment service source
- `/nginx/` - Reverse proxy configuration
- `docker-compose.prod.yml` - Production configuration
- `.env.production` - Production environment variables
- `README.md` - Essential documentation
### 
AWS Cost Elimination Strategy
**Current Resources Audit:**
1. **EC2 Instance**: i-076e2d935f05ecb88 (t3.micro - free tier eligible)
2. **EBS Volume**: Default 8GB (within free tier)
3. **Security Groups**: sg-0e52b387ef3cfa3cc (free)
4. **Key Pairs**: Multiple pairs (cleanup needed)

**Cost Optimization Actions:**
- Verify instance type is t2.micro or t3.micro (free tier)
- Ensure EBS volume ≤ 30GB free tier limit
- Remove unused security groups and key pairs
- Implement auto-shutdown for cost protection
- Monitor data transfer (15GB/month limit)

### Docker Optimization Strategy
**Memory Allocation (Total: ~900MB available on t2.micro):**
- Nginx: 30MB (reverse proxy, static files)
- Backend (.NET): 200MB (API, business logic)
- Payment Service: 150MB (Node.js microservice)
- Frontend: 150MB (Next.js SSR)
- MongoDB: 250MB (database with cache limits)
- Redis: 64MB (caching, sessions)
- System Reserve: 56MB (OS, Docker daemon)

**Container Optimization:**
- Multi-stage builds for minimal image sizes
- Alpine Linux base images where possible
- Memory limits and swap configuration
- Health checks for automatic recovery
- Restart policies for high availability

## Data Models

### Environment Configuration
```yaml
Production Environment Variables:
- NODE_ENV: production
- ASPNETCORE_ENVIRONMENT: Production
- JWT_SECRET: [32+ character secure key]
- Database passwords: [secure generated passwords]
- Service URLs: [internal Docker network URLs]
```

### Docker Compose Structure
```yaml
services:
  nginx: [reverse proxy, SSL termination]
  frontend: [Next.js application]
  backend: [.NET API]
  payment-service: [Node.js microservice]
  mongodb: [primary database]
  redis: [caching layer]
```

## Error Handling

### Cost Protection Mechanisms
1. **Automated Monitoring**: Hourly AWS cost checks
2. **Resource Limits**: Hard memory and CPU limits on containers
3. **Auto-Shutdown**: Emergency termination if costs detected
4. **Alerts**: Email notifications for threshold breaches
5. **Failsafe**: Manual override capabilities

### Application Resilience
1. **Health Checks**: All services monitored every 30 seconds
2. **Restart Policies**: Automatic container recovery
3. **Circuit Breakers**: Service isolation during failures
4. **Graceful Degradation**: Core functionality maintained during partial outages
5. **Data Persistence**: Volume mounts for critical data

## Testing Strategy

### Pre-Deployment Validation
1. **File Cleanup Verification**: Ensure only production files remain
2. **Docker Build Tests**: All containers build successfully
3. **Memory Usage Tests**: Total usage within EC2 limits
4. **Service Integration Tests**: All APIs respond correctly
5. **Security Scans**: No vulnerabilities in production images

### Post-Deployment Verification
1. **Functional Tests**: All application features working
2. **Performance Tests**: Response times within acceptable limits
3. **Cost Monitoring**: Zero AWS charges confirmed
4. **Security Tests**: SSL, authentication, authorization working
5. **Backup Tests**: Data persistence and recovery procedures