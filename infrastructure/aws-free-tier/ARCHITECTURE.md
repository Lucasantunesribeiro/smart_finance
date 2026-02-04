# SmartFinance - Arquitetura AWS Free Tier

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                             INTERNET                                 │
│                      (Usuários Finais)                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ HTTPS (443)
                           │ HTTP (80)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ELASTIC IP                                   │
│                      (Free when attached)                            │
│                      Public: X.X.X.X                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EC2 t2.micro (Free Tier)                          │
│                   1 vCPU, 1 GB RAM, 20 GB EBS                        │
│                   Ubuntu 22.04 LTS                                   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      NGINX (Port 80/443)                      │  │
│  │  • Reverse Proxy                                              │  │
│  │  • SSL/TLS Termination (Let's Encrypt)                        │  │
│  │  • Rate Limiting (10 req/s API, 5 req/m login)                │  │
│  │  • Gzip Compression                                            │  │
│  │  • Static Asset Caching                                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                           │                                           │
│                           │                                           │
│  ┌────────────────────────┼──────────────────────────────────────┐  │
│  │        Docker Network (smartfinance_network)                  │  │
│  │                        │                                       │  │
│  │  ┌─────────────────────┼───────────────────────────────────┐  │  │
│  │  │         Port Mapping: 0.0.0.0:3000 → container:3000     │  │  │
│  │  │                      0.0.0.0:5000 → container:5000      │  │  │
│  │  └─────────────────────┬───────────────────────────────────┘  │  │
│  │                        │                                       │  │
│  │  ┌─────────────────────┴──────────────┐                       │  │
│  │  │     Frontend Container              │                       │  │
│  │  │     (Next.js 14)                    │                       │  │
│  │  │  • Port: 3000                       │                       │  │
│  │  │  • RAM: 200 MB limit                │                       │  │
│  │  │  • CPU: 0.3 cores                   │                       │  │
│  │  │  • Health Check: /api/health.json   │                       │  │
│  │  └─────────────────────┬───────────────┘                       │  │
│  │                        │                                       │  │
│  │  ┌─────────────────────┴──────────────┐                       │  │
│  │  │     Backend Container               │                       │  │
│  │  │     (Node.js microservice)          │                       │  │
│  │  │  • Port: 5000                       │                       │  │
│  │  │  • RAM: 300 MB limit                │                       │  │
│  │  │  • CPU: 0.4 cores                   │                       │  │
│  │  │  • Health Check: /health            │                       │  │
│  │  │  • SignalR Hub: /financehub         │                       │  │
│  │  └─────────────────────┬───────────────┘                       │  │
│  │                        │                                       │  │
│  │  ┌─────────────────────┴──────────────┐                       │  │
│  │  │     PostgreSQL Container            │                       │  │
│  │  │     (postgres:15-alpine)            │                       │  │
│  │  │  • Port: 5432 (internal)            │                       │  │
│  │  │  • RAM: 200 MB limit                │                       │  │
│  │  │  • CPU: 0.3 cores                   │                       │  │
│  │  │  • Volume: postgres_data            │                       │  │
│  │  │  • Health Check: pg_isready         │                       │  │
│  │  └─────────────────────────────────────┘                       │  │
│  │                                                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    SYSTEMD SERVICES                           │  │
│  │  • smartfinance.service (auto-start containers)               │  │
│  │  • nginx.service                                              │  │
│  │  • docker.service                                             │  │
│  │  • fail2ban.service (SSH protection)                          │  │
│  │  • certbot.timer (SSL renewal)                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    CRON JOBS                                  │  │
│  │  • 0 3 * * * - Backup PostgreSQL to S3                        │  │
│  │  • */5 * * * * - Health check + CloudWatch metrics            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  CLOUDWATCH AGENT                             │  │
│  │  • CPU metrics (every 60s)                                    │  │
│  │  • Memory metrics (every 60s)                                 │  │
│  │  • Disk metrics (every 60s)                                   │  │
│  │  • Log forwarding                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
              ▼                            ▼
┌─────────────────────────┐   ┌───────────────────────────┐
│    S3 BUCKET            │   │   CLOUDWATCH              │
│    (Free Tier 5 GB)     │   │   (Free Tier)             │
│                         │   │                           │
│  • Daily Backups (7d)   │   │  • Dashboard              │
│  • Weekly Backups (4w)  │   │  • 5 Alarms:              │
│  • Encryption: AES256   │   │    - Disk > 80%           │
│  • Lifecycle: 30 days   │   │    - Memory > 90%         │
│  • Storage: ~1.1 GB     │   │    - Backend unhealthy    │
│                         │   │    - DB unhealthy         │
│                         │   │    - EC2 status check     │
│                         │   │  • 6 Custom Metrics       │
│                         │   │  • Log Groups             │
└─────────────────────────┘   └────────────┬──────────────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │   SNS TOPIC            │
                              │   (Email Alerts)       │
                              │                        │
                              │  • user@example.com    │
                              └────────────────────────┘
```

## Fluxo de Requisição

### 1. Requisição HTTP/HTTPS

```
User Browser
    │
    │ 1. HTTPS Request
    ▼
Nginx (Port 443)
    │
    │ 2. SSL Termination (Let's Encrypt)
    │ 3. Rate Limiting Check
    │ 4. Gzip Compression
    ▼
Route Decision:
    │
    ├─► /api/v1/* ────────► Backend Container (Port 5000)
    │                           │
    │                           │ 5. JWT Validation
    │                           │ 6. Business Logic
    │                           ▼
    │                       PostgreSQL Container (Port 5432)
    │                           │
    │                           │ 7. SQL Query
    │                           ▼
    │                       Return Data
    │
    ├─► /financehub ─────► SignalR Hub (Backend Port 5000)
    │                           │
    │                           │ 8. WebSocket Connection
    │                           ▼
    │                       Real-time Updates
    │
    └─► /* (Frontend) ───► Frontend Container (Port 3000)
                                │
                                │ 9. Next.js SSR/SSG
                                │ 10. React Rendering
                                ▼
                            HTML Response
```

### 2. Backup Flow

```
Cron Job (3:00 AM UTC)
    │
    │ 1. Trigger backup-postgres.sh
    ▼
/opt/smartfinance/backup-postgres.sh
    │
    │ 2. docker exec pg_dump
    ▼
PostgreSQL Container
    │
    │ 3. SQL dump + gzip
    ▼
/opt/smartfinance/backups/smartfinance_backup_YYYYMMDD.sql.gz
    │
    │ 4. aws s3 cp
    ▼
S3 Bucket (daily/)
    │
    │ 5. If Sunday, copy to weekly/
    ▼
S3 Bucket (weekly/)
    │
    │ 6. Lifecycle policy cleanup (> 7 days daily, > 4 weeks weekly)
    ▼
Old backups deleted automatically
```

### 3. Monitoring Flow

```
Cron Job (Every 5 minutes)
    │
    │ 1. Trigger health-check.sh
    ▼
/opt/smartfinance/health-check.sh
    │
    ├─► Check Docker Containers (docker ps)
    ├─► Check Frontend (curl localhost:3000)
    ├─► Check Backend (curl localhost:5000/health)
    ├─► Check PostgreSQL (docker exec pg_isready)
    └─► Check Nginx (systemctl status)
        │
        │ 2. Send metrics
        ▼
CloudWatch PutMetricData
    │
    ├─► ContainersHealthy (0 or 1)
    ├─► FrontendHealthy (0 or 1)
    ├─► BackendHealthy (0 or 1)
    ├─► DatabaseHealthy (0 or 1)
    └─► NginxHealthy (0 or 1)
        │
        │ 3. Evaluate alarms
        ▼
CloudWatch Alarms
    │
    │ 4. If threshold breached
    ▼
SNS Topic
    │
    │ 5. Send email
    ▼
User Email
```

## Limites de Recursos

### EC2 t2.micro (Free Tier)

| Recurso | Limite | Utilização |
|---------|--------|------------|
| **vCPU** | 1 core (burstable) | Frontend: 30%, Backend: 40%, DB: 30% |
| **RAM** | 1 GB | OS: 300 MB, Frontend: 200 MB, Backend: 300 MB, DB: 200 MB |
| **Storage** | 20 GB EBS gp3 | Docker images: ~5 GB, Logs: ~1 GB, Free: ~14 GB |
| **Network** | Até 2.5 Gbps | Típico: 1-10 Mbps |
| **Burst Credits** | 144 credits/hora | Acumula até 144 créditos quando idle |

### Distribuição de Memória (1 GB total)

```
┌────────────────────────────────────────────┐
│  Sistema Operacional + Kernel   │ 300 MB  │
├────────────────────────────────────────────┤
│  Frontend Container              │ 200 MB  │
├────────────────────────────────────────────┤
│  Backend Container               │ 300 MB  │
├────────────────────────────────────────────┤
│  PostgreSQL Container            │ 200 MB  │
└────────────────────────────────────────────┘
Total: 1000 MB (1 GB)

Swap configurado: 2 GB (arquivo /swapfile)
```

### Free Tier Limits

| Serviço | Free Tier | Uso Atual | Status |
|---------|-----------|-----------|--------|
| **EC2** | 750 horas/mês | 730 horas/mês (1 instância 24/7) | ✓ Dentro |
| **EBS** | 30 GB | 20 GB | ✓ Dentro |
| **S3 Storage** | 5 GB | ~1.1 GB | ✓ Dentro |
| **S3 Requests** | 2,000 PUT, 20,000 GET | ~30 PUT, ~100 GET/mês | ✓ Dentro |
| **Data Transfer** | 15 GB out/mês | ~5 GB/mês | ✓ Dentro |
| **CloudWatch Metrics** | 10 custom metrics | 6 metrics | ✓ Dentro |
| **CloudWatch Alarms** | 10 alarms | 5 alarms | ✓ Dentro |
| **CloudWatch Logs** | 5 GB | ~100 MB/mês | ✓ Dentro |

## Security Architecture

### Network Security

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY GROUP                            │
│                                                               │
│  Inbound Rules:                                              │
│    • Port 80 (HTTP)    → 0.0.0.0/0  (public)                │
│    • Port 443 (HTTPS)  → 0.0.0.0/0  (public)                │
│    • Port 22 (SSH)     → 0.0.0.0/0  (⚠️ Restringir ao seu IP) │
│                                                               │
│  Outbound Rules:                                             │
│    • All traffic       → 0.0.0.0/0  (allow all)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    UFW FIREWALL (Host)                       │
│                                                               │
│  • Port 22:  Allow (SSH)                                     │
│  • Port 80:  Allow (HTTP)                                    │
│  • Port 443: Allow (HTTPS)                                   │
│  • Default:  Deny incoming, Allow outgoing                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    FAIL2BAN                                  │
│                                                               │
│  • Monitor: /var/log/auth.log                                │
│  • Action:  Ban IP after 5 failed SSH attempts               │
│  • Ban time: 10 minutes (default)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    NGINX RATE LIMITING                       │
│                                                               │
│  • API endpoints: 10 requests/second (burst 20)              │
│  • Login endpoint: 5 requests/minute (burst 3)               │
│  • Action: Return 429 Too Many Requests                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DOCKER NETWORK ISOLATION                  │
│                                                               │
│  • PostgreSQL: Not exposed to host (internal only)           │
│  • Backend: 127.0.0.1:5000 (localhost only)                  │
│  • Frontend: 127.0.0.1:3000 (localhost only)                 │
│  • Nginx: Reverse proxy (only public-facing service)         │
└─────────────────────────────────────────────────────────────┘
```

### Application Security

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION                            │
│                                                               │
│  • JWT Tokens (Access + Refresh)                             │
│  • Secure secrets in .env (600 permissions)                  │
│  • HTTPS-only cookies (if SSL configured)                    │
│  • Password hashing: bcrypt                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DATA SECURITY                             │
│                                                               │
│  • Database: Docker volume (persistent)                      │
│  • Backups: S3 with AES256 encryption                        │
│  • Secrets: Environment variables (not in code)              │
│  • SSL/TLS: Let's Encrypt (free, auto-renew)                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SECURITY HEADERS (Nginx)                  │
│                                                               │
│  • Strict-Transport-Security: max-age=31536000               │
│  • X-Frame-Options: SAMEORIGIN                               │
│  • X-Content-Type-Options: nosniff                           │
│  • X-XSS-Protection: 1; mode=block                           │
│  • Referrer-Policy: no-referrer-when-downgrade               │
└─────────────────────────────────────────────────────────────┘
```

## Disaster Recovery

### Backup Strategy

```
Daily Backups (Retention: 7 days)
    │
    ├─► Day 1: smartfinance_backup_20260203_030000.sql.gz
    ├─► Day 2: smartfinance_backup_20260204_030000.sql.gz
    ├─► Day 3: smartfinance_backup_20260205_030000.sql.gz
    ├─► Day 4: smartfinance_backup_20260206_030000.sql.gz
    ├─► Day 5: smartfinance_backup_20260207_030000.sql.gz
    ├─► Day 6: smartfinance_backup_20260208_030000.sql.gz
    └─► Day 7: smartfinance_backup_20260209_030000.sql.gz (oldest deleted)

Weekly Backups (Retention: 4 weeks, Sundays only)
    │
    ├─► Week 1: smartfinance_weekly_20260202_030000.sql.gz
    ├─► Week 2: smartfinance_weekly_20260209_030000.sql.gz
    ├─► Week 3: smartfinance_weekly_20260216_030000.sql.gz
    └─► Week 4: smartfinance_weekly_20260223_030000.sql.gz (oldest deleted)
```

### Recovery Time Objective (RTO)

| Cenário | RTO | Procedimento |
|---------|-----|--------------|
| **Container crash** | < 1 min | Docker auto-restart |
| **Application bug** | 5-10 min | Git rollback + rebuild |
| **Database corruption** | 10-20 min | Restore from S3 backup |
| **EC2 instance failure** | 30-60 min | Launch new EC2, restore backup |
| **Complete disaster** | 1-2 horas | Re-run all scripts + restore |

### Recovery Point Objective (RPO)

| Cenário | RPO | Data Loss |
|---------|-----|-----------|
| **Daily backup** | 24 horas | Últimas 24h de dados |
| **Manual backup** | 0 (on-demand) | Nenhum |

## Performance Characteristics

### Expected Performance

| Metric | Target | Notes |
|--------|--------|-------|
| **Page Load Time** | < 3s | First load (SSR) |
| **API Response Time** | < 500ms | 95th percentile |
| **Concurrent Users** | 50-100 | Without degradation |
| **Database Queries** | < 100ms | Simple queries |
| **Uptime** | > 99% | ~7 horas downtime/ano |

### Bottlenecks

1. **RAM (1 GB)**
   - Limitação principal
   - Swap ajuda mas é lento
   - Solução: Upgrade para t3.small (2 GB)

2. **CPU (1 vCPU burstable)**
   - Suficiente para low-medium traffic
   - Burst credits se esgotam sob carga pesada
   - Solução: t3.small ou t3.medium

3. **Network (burstable)**
   - Baseline: ~140 Mbps
   - Burst: até 2.5 Gbps
   - Data transfer: 15 GB/mês free

4. **Disk I/O (EBS gp3)**
   - 3,000 IOPS baseline
   - Suficiente para PostgreSQL small workload

## Scaling Strategy

### Vertical Scaling (Same Architecture)

```
Current: t2.micro (1 vCPU, 1 GB RAM) - $0/mês Free Tier
    ↓ Upgrade when needed
t3.small (2 vCPU, 2 GB RAM) - ~$15/mês
    ↓ Upgrade when needed
t3.medium (2 vCPU, 4 GB RAM) - ~$30/mês
    ↓ Upgrade when needed
t3.large (2 vCPU, 8 GB RAM) - ~$60/mês
```

### Horizontal Scaling (New Architecture)

```
Current: Single EC2 Instance
    ↓ Migrate to
ECS Fargate + ALB + RDS
    • Auto-scaling containers
    • Multi-AZ RDS
    • Application Load Balancer
    • Cost: ~$110-147/mês
```

### Database Scaling

```
Current: PostgreSQL in Docker
    ↓ Migrate to
RDS db.t3.micro (Single-AZ) - ~$16/mês
    ↓ Upgrade to
RDS db.t3.small (Multi-AZ) - ~$60/mês
    ↓ Upgrade to
Aurora Serverless v2 - $43+/mês
```

---

**Documentação criada:** 2026-02-03
**Última atualização:** 2026-02-03
