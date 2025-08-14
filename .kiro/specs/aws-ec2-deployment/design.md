# Design Document

## Overview

Este documento descreve o design técnico para o deploy completo do sistema SmartFinance na AWS EC2 utilizando a camada gratuita. A solução implementa uma arquitetura de deploy automatizada com CI/CD via GitHub Actions, garantindo que o sistema seja entregue de forma limpa, funcional e 100% gratuita.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "GitHub"
        REPO[Repository<br/>smart_finance]
        GA[GitHub Actions<br/>CI/CD Pipeline]
    end
    
    subgraph "AWS Free Tier"
        EC2[EC2 t2.micro<br/>Ubuntu 22.04 LTS]
        SG[Security Group<br/>Ports: 22, 80, 443]
        EIP[Elastic IP<br/>Public Access]
    end
    
    subgraph "EC2 Instance"
        DOCKER[Docker Engine]
        COMPOSE[Docker Compose]
        
        subgraph "SmartFinance Services"
            NGINX[Nginx<br/>Port 80/443]
            FRONTEND[Next.js Frontend<br/>Port 3000]
            BACKEND[.NET Backend<br/>Port 5000]
            PAYMENT[Node.js Payment<br/>Port 3001]
            SQLSERVER[SQL Server<br/>Port 1433]
            MONGODB[MongoDB<br/>Port 27017]
            REDIS[Redis<br/>Port 6380]
            PROMETHEUS[Prometheus<br/>Port 9090]
            GRAFANA[Grafana<br/>Port 3002]
        end
    end
    
    subgraph "External Access"
        USER[End Users]
        CLIENT[Client Access]
    end
    
    REPO --> GA
    GA -->|SSH Deploy| EC2
    EC2 --> EIP
    EIP --> USER
    EIP --> CLIENT
    
    NGINX --> FRONTEND
    NGINX --> BACKEND
    NGINX --> PAYMENT
    
    BACKEND --> SQLSERVER
    BACKEND --> REDIS
    PAYMENT --> MONGODB
    PAYMENT --> REDIS
```

### Deployment Flow

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant GH as GitHub
    participant GA as GitHub Actions
    participant EC2 as AWS EC2
    participant DOCKER as Docker Services
    
    DEV->>GH: Push code to main branch
    GH->>GA: Trigger CI/CD workflow
    GA->>GA: Build Docker images
    GA->>EC2: Connect via SSH
    GA->>EC2: Pull latest code
    GA->>DOCKER: Stop existing services
    GA->>DOCKER: Deploy new services
    GA->>DOCKER: Run health checks
    DOCKER->>GA: Return service status
    GA->>GH: Update deployment status
```

## Components and Interfaces

### 1. Project Cleanup Module

**Purpose:** Remove arquivos desnecessários e preparar projeto para produção

**Components:**
- **File Cleaner:** Remove scripts de desenvolvimento (.ps1, .bat)
- **Config Optimizer:** Substitui configurações de desenvolvimento por produção
- **Documentation Cleaner:** Remove documentação interna desnecessária

**Interface:**
```bash
# Arquivos a serem removidos
./scripts/                    # Scripts de desenvolvimento
MOCK_DATA_CLEANUP_SUMMARY.md  # Documentação interna
CLAUDE.local.md              # Documentação local
.env.local                   # Configurações locais
.env.development             # Configurações de desenvolvimento

# Arquivos a serem mantidos
docker-compose.yml           # Orquestração de serviços
backend/Dockerfile          # Build do backend
frontend/Dockerfile         # Build do frontend
microservice/Dockerfile     # Build do microservice
nginx/nginx.conf            # Configuração do proxy
monitoring/                 # Configurações de monitoramento
```

### 2. AWS EC2 Configuration Module

**Purpose:** Configurar instância EC2 na camada gratuita

**Components:**
- **Instance Manager:** Gerencia criação e configuração da instância
- **Security Group Manager:** Configura regras de firewall
- **Software Installer:** Instala Docker e dependências

**Specifications:**
```yaml
Instance Type: t2.micro (1 vCPU, 1 GB RAM)
Operating System: Ubuntu 22.04 LTS
Storage: 30 GB gp3 (Free Tier)
Network: Default VPC with public subnet
Security Group Rules:
  - SSH (22): Source 0.0.0.0/0
  - HTTP (80): Source 0.0.0.0/0
  - HTTPS (443): Source 0.0.0.0/0
```

### 3. CI/CD Pipeline Module

**Purpose:** Automatizar build e deploy via GitHub Actions

**Components:**
- **Build Stage:** Constrói imagens Docker
- **Deploy Stage:** Executa deploy via SSH
- **Health Check Stage:** Verifica status dos serviços

**Workflow Configuration:**
```yaml
name: Deploy to AWS EC2
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
      - name: Setup SSH
      - name: Deploy to EC2
      - name: Health check
```

### 4. Service Orchestration Module

**Purpose:** Gerenciar todos os serviços do SmartFinance

**Components:**
- **Container Manager:** Gerencia containers Docker
- **Network Manager:** Configura rede interna
- **Volume Manager:** Gerencia persistência de dados

**Service Configuration:**
```yaml
Services:
  - nginx: Reverse proxy e SSL termination
  - frontend: Next.js application
  - backend: .NET API
  - payment-service: Node.js microservice
  - sqlserver: SQL Server database
  - mongodb: MongoDB database
  - redis: Redis cache
  - prometheus: Monitoring
  - grafana: Dashboards
```

### 5. Monitoring and Health Check Module

**Purpose:** Garantir confiabilidade do sistema em produção

**Components:**
- **Health Check Manager:** Verifica status de todos os serviços
- **Log Aggregator:** Centraliza logs do sistema
- **Alert Manager:** Notifica sobre problemas

**Health Check Endpoints:**
```
GET /health - Backend API health
GET /health - Payment service health
GET / - Frontend health
GET /-/healthy - Prometheus health
GET /api/health - Grafana health
```

## Data Models

### 1. Deployment Configuration

```yaml
deployment:
  environment: production
  instance:
    type: t2.micro
    os: ubuntu-22.04
    region: us-east-1
  services:
    nginx:
      port: 80, 443
      ssl: enabled
    frontend:
      port: 3000
      build: production
    backend:
      port: 5000
      environment: Production
    payment:
      port: 3001
      environment: production
  databases:
    sqlserver:
      port: 1433
      password: ${SQL_PASSWORD}
    mongodb:
      port: 27017
      password: ${MONGO_PASSWORD}
    redis:
      port: 6380
      password: ${REDIS_PASSWORD}
```

### 2. GitHub Secrets Configuration

```yaml
secrets:
  EC2_HOST: ${EC2_PUBLIC_IP}
  EC2_USERNAME: ubuntu
  EC2_SSH_KEY: ${PRIVATE_KEY}
  SQL_PASSWORD: ${SECURE_PASSWORD}
  MONGO_PASSWORD: ${SECURE_PASSWORD}
  REDIS_PASSWORD: ${SECURE_PASSWORD}
  JWT_SECRET: ${SECURE_JWT_SECRET}
```

### 3. Environment Variables

```bash
# Production Environment
NODE_ENV=production
ASPNETCORE_ENVIRONMENT=Production

# Database Connections
ConnectionStrings__DefaultConnection=Data Source=smartfinance.db
ConnectionStrings__RedisConnection=redis:6379,password=${REDIS_PASSWORD}
ConnectionStrings__MongoConnection=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/smartfinance_logs?authSource=admin

# Security
Jwt__SecretKey=${JWT_SECRET}
Jwt__Issuer=SmartFinance
Jwt__Audience=SmartFinanceUsers

# Service URLs
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SIGNALR_URL=/financehub
NEXT_PUBLIC_PAYMENT_SERVICE_URL=/payment
```

## Error Handling

### 1. Deployment Failures

**Strategy:** Rollback automático em caso de falha

```yaml
error_handling:
  deployment_timeout: 300s
  health_check_retries: 3
  rollback_strategy: automatic
  notification: github_status
```

### 2. Service Failures

**Strategy:** Restart automático com circuit breaker

```yaml
restart_policy:
  condition: on-failure
  max_attempts: 3
  delay: 30s
```

### 3. Resource Constraints

**Strategy:** Otimização para t2.micro (1GB RAM)

```yaml
resource_limits:
  frontend:
    memory: 256MB
    cpu: 0.25
  backend:
    memory: 512MB
    cpu: 0.5
  payment:
    memory: 256MB
    cpu: 0.25
  databases:
    memory: 256MB each
    cpu: 0.25 each
```

## Testing Strategy

### 1. Pre-deployment Testing

```bash
# Local testing
docker-compose up -d --build
./scripts/test-system.ps1

# Build validation
docker build -t smartfinance/backend ./backend
docker build -t smartfinance/frontend ./frontend
docker build -t smartfinance/payment ./microservice
```

### 2. Post-deployment Testing

```bash
# Service availability
curl -f http://${EC2_IP}/health
curl -f http://${EC2_IP}/api/v1/health
curl -f http://${EC2_IP}/payment/health

# End-to-end testing
curl -X POST http://${EC2_IP}/api/v1/simpleauth/login
curl -X GET http://${EC2_IP}/api/v1/analytics/summary
```

### 3. Performance Testing

```bash
# Resource monitoring
docker stats
free -h
df -h

# Load testing
ab -n 100 -c 10 http://${EC2_IP}/
```

## Security Considerations

### 1. Network Security

- Security Group com regras mínimas necessárias
- SSH key-based authentication
- HTTPS enforcement via Nginx
- Internal network isolation

### 2. Application Security

- JWT token authentication
- Input validation em todas as APIs
- Rate limiting via Nginx
- Secure headers configuration

### 3. Data Security

- Database passwords via environment variables
- Encrypted connections entre serviços
- Regular security updates via automated deployment

## Performance Optimization

### 1. Resource Optimization

```yaml
optimizations:
  docker:
    - Multi-stage builds para reduzir tamanho das imagens
    - Alpine Linux base images
    - .dockerignore para excluir arquivos desnecessários
  
  application:
    - Next.js production build com otimizações
    - .NET AOT compilation para startup mais rápido
    - Redis caching para reduzir carga no banco
  
  infrastructure:
    - Nginx gzip compression
    - Static file caching
    - Connection pooling nos bancos de dados
```

### 2. Memory Management

```yaml
memory_limits:
  total_available: 1GB
  system_reserved: 200MB
  docker_overhead: 100MB
  application_pool: 700MB
  
allocation:
  backend: 300MB (42%)
  frontend: 150MB (21%)
  payment: 100MB (14%)
  databases: 150MB (21%)
```

## Deployment Phases

### Phase 1: Preparation
1. Project cleanup and optimization
2. GitHub repository setup
3. AWS account and EC2 instance creation

### Phase 2: Infrastructure Setup
1. EC2 instance configuration
2. Docker and Docker Compose installation
3. Security group and network configuration

### Phase 3: CI/CD Implementation
1. GitHub Actions workflow creation
2. SSH key configuration
3. Environment variables setup

### Phase 4: Deployment and Testing
1. Initial deployment execution
2. Health checks and monitoring setup
3. End-to-end testing and validation

### Phase 5: Documentation and Handover
1. Deployment documentation creation
2. Troubleshooting guide
3. Client handover with access credentials