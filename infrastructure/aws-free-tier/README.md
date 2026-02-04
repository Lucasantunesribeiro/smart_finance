# SmartFinance - AWS Free Tier Deployment ($0/mês)

Esta arquitetura permite rodar o SmartFinance com **custo ZERO** durante o primeiro ano do AWS Free Tier, e aproximadamente **$8-10/mês** após o Free Tier expirar.

## Índice

- [Arquitetura](#arquitetura)
- [Custos](#custos)
- [Pré-requisitos](#pré-requisitos)
- [Quick Start](#quick-start)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Gestão da Aplicação](#gestão-da-aplicação)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Arquitetura

### Visão Geral

```
Internet
  ↓
Elastic IP (Free)
  ↓
EC2 t2.micro (1 vCPU, 1 GB RAM) - Free Tier
  ├── Nginx (Reverse Proxy + SSL)
  ├── Frontend Container (Next.js) - 200 MB RAM
  ├── Backend Container (Node.js) - 300 MB RAM
  └── PostgreSQL Container (15-alpine) - 200 MB RAM

Backups → S3 Bucket (Free Tier 5 GB)
Monitoring → CloudWatch (Free Tier)
Alerts → SNS → Email
```

### Componentes

| Componente | Tecnologia | RAM | Custo Free Tier | Custo Após Free Tier |
|------------|------------|-----|-----------------|----------------------|
| **Compute** | EC2 t2.micro | 1 GB | $0 (750h/mês) | ~$8/mês |
| **Storage** | EBS gp3 20 GB | - | $0 (30 GB) | $0.80/mês |
| **Network** | Elastic IP | - | $0 (attached) | $0 |
| **Data Transfer** | 15 GB/mês | - | $0 | $0 |
| **Backups** | S3 | ~1.1 GB | $0 (5 GB) | $0.03/mês |
| **Monitoring** | CloudWatch | - | $0 (10 métricas) | $0 |
| **SSL** | Let's Encrypt | - | $0 | $0 |
| **Total** | | | **$0/mês** | **~$9/mês** |

---

## Custos

### Ano 1 (Free Tier Ativo): **$0/mês** ✅

Todos os recursos estão dentro dos limites do AWS Free Tier (12 meses):
- ✅ EC2 t2.micro: 750 horas/mês (suficiente para 1 instância 24/7)
- ✅ EBS: 20 GB de 30 GB disponíveis
- ✅ S3: ~1.1 GB de 5 GB disponíveis
- ✅ Data Transfer: ~2-5 GB de 15 GB disponíveis
- ✅ CloudWatch: 6 métricas de 10 disponíveis, 5 alarmes de 10 disponíveis

### Ano 2+: **~$8-10/mês**

Após expiração do Free Tier:
- EC2 t2.micro: $0.0116/hora × 730h = **$8.47/mês**
- EBS gp3 20 GB: $0.08/GB = **$1.60/mês**
- S3: $0.023/GB × 1.1 GB = **$0.03/mês**
- Data Transfer: Primeiros 1 TB/mês = **$0.09/GB** (estimado ~$0.50/mês)
- CloudWatch: Métricas dentro do "Always Free" tier
- **Total estimado: $10.60/mês**

### Comparação com Alternativas

| Solução | Custo Ano 1 | Custo Ano 2+ | Nota |
|---------|-------------|--------------|------|
| **EC2 Free Tier (esta solução)** | $0 | $9/mês | ✅ Recomendada |
| Lightsail $5 | $5/mês | $5/mês | Menos RAM (512 MB) |
| ECS Fargate + ALB + RDS | $110-147/mês | $110-147/mês | ❌ Muito caro |
| Lambda + RDS Aurora | $43+/mês | $43+/mês | ❌ Aurora fora do Free Tier |

---

## Pré-requisitos

### 1. Conta AWS com Free Tier

- Conta AWS criada há menos de 12 meses (para Free Tier)
- Se conta > 12 meses, ainda funciona mas custará ~$9/mês

### 2. AWS CLI Configurado

```bash
# Instalar AWS CLI
pip install awscli

# Configurar credenciais
aws configure
# AWS Access Key ID: [sua access key]
# AWS Secret Access Key: [sua secret key]
# Default region name: us-east-1
# Default output format: json
```

### 3. Ferramentas Locais

```bash
# Verificar ferramentas necessárias
which ssh    # SSH client
which scp    # Secure copy
which tar    # Tar/gzip
which dig    # DNS lookup (opcional, para SSL)
```

### 4. Domínio (Opcional)

- Se quiser HTTPS, configure um domínio apontando para o Elastic IP
- Gratuito: Freenom, DuckDNS, No-IP
- Pago: Namecheap, GoDaddy, Route53

---

## Quick Start

### Passo 1: Criar EC2 Instance (15 min)

```bash
cd infrastructure/aws-free-tier
chmod +x *.sh

# Criar instância EC2 t2.micro + Elastic IP + Security Group
./1-create-ec2.sh

# Aguardar 5 minutos para user-data script completar
# Verificar instalação:
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP> 'tail -f /var/log/user-data.log'
```

**O que este script faz:**
- ✅ Cria EC2 t2.micro Ubuntu 22.04 LTS
- ✅ Configura Security Group (HTTP 80, HTTPS 443, SSH 22)
- ✅ Aloca e associa Elastic IP
- ✅ Instala Docker + Docker Compose
- ✅ Configura swap de 2 GB (t2.micro tem apenas 1 GB RAM)
- ✅ Instala Fail2Ban + UFW firewall
- ✅ Instala AWS CLI

### Passo 2: Deploy da Aplicação (20 min)

```bash
# Deploy completo: código + Nginx + containers
./2-deploy-application.sh

# Verificar aplicação
curl http://<ELASTIC_IP>/health        # Nginx
curl http://<ELASTIC_IP>/api/v1/health # Backend
curl http://<ELASTIC_IP>/               # Frontend
```

**O que este script faz:**
- ✅ Configura Nginx como reverse proxy
- ✅ Envia código (backend + frontend + microservice)
- ✅ Gera secrets seguros (JWT, DB password)
- ✅ Cria docker-compose.ec2.yml otimizado para t2.micro
- ✅ Build e inicia containers
- ✅ Configura auto-start com systemd

### Passo 3: Configurar SSL/HTTPS (Opcional, 15 min)

```bash
# Requer domínio apontando para Elastic IP
./3-setup-ssl.sh seu-dominio.com seu-email@example.com

# Verificar SSL
curl -I https://seu-dominio.com
```

**O que este script faz:**
- ✅ Instala Certbot
- ✅ Obtém certificado SSL gratuito do Let's Encrypt
- ✅ Configura Nginx com SSL/TLS 1.2+
- ✅ Configura redirect HTTP → HTTPS
- ✅ Configura auto-renewal (90 dias)

### Passo 4: Configurar Backups (10 min)

```bash
# Backups diários para S3 (Free Tier)
./4-setup-backups.sh

# Verificar primeiro backup
aws s3 ls s3://<BUCKET_NAME>/daily/
```

**O que este script faz:**
- ✅ Cria S3 bucket com encryption
- ✅ Configura IAM role para EC2 → S3
- ✅ Instala script de backup PostgreSQL
- ✅ Configura cron job (diário às 3h AM UTC)
- ✅ Retenção: 7 backups diários + 4 semanais
- ✅ Executa primeiro backup (teste)

### Passo 5: Configurar Monitoramento (10 min)

```bash
# CloudWatch + SNS alertas
./5-setup-monitoring.sh

# Email: Digite seu email para receber alertas
# ⚠️ IMPORTANTE: Confirme a inscrição SNS pelo email!
```

**O que este script faz:**
- ✅ Configura CloudWatch Agent
- ✅ Métricas customizadas (CPU, RAM, disk, app health)
- ✅ 5 alarmes (disk > 80%, memory > 90%, app unhealthy, etc)
- ✅ Dashboard CloudWatch
- ✅ SNS topic para email alerts
- ✅ Health check script (a cada 5 minutos)

---

## Scripts Disponíveis

| Script | Tempo | Descrição |
|--------|-------|-----------|
| `1-create-ec2.sh` | 15 min | Cria infraestrutura AWS (EC2, IP, Security Group) |
| `2-deploy-application.sh` | 20 min | Deploy completo da aplicação |
| `3-setup-ssl.sh <domain> <email>` | 15 min | Configura SSL/HTTPS com Let's Encrypt |
| `4-setup-backups.sh` | 10 min | Configura backups automáticos para S3 |
| `5-setup-monitoring.sh` | 10 min | Configura CloudWatch monitoring e alertas |
| `estimate-costs.sh` | 1 min | Estima custos mensais (útil após Free Tier) |
| `cleanup.sh` | 5 min | Destroi toda infraestrutura (cleanup completo) |

### Execução Completa (All-in-One)

Se quiser executar tudo de uma vez (exceto SSL que requer domínio):

```bash
# Setup completo
./1-create-ec2.sh && \
sleep 300 && \
./2-deploy-application.sh && \
./4-setup-backups.sh && \
./5-setup-monitoring.sh

# Depois, se tiver domínio:
./3-setup-ssl.sh seu-dominio.com seu-email@example.com
```

---

## Gestão da Aplicação

### SSH na Instância EC2

```bash
# Conectar
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Navegar para aplicação
cd /opt/smartfinance
```

### Docker Compose

```bash
# Ver status dos containers
docker compose ps

# Ver logs
docker compose logs -f              # Todos
docker compose logs -f frontend     # Apenas frontend
docker compose logs -f microservice # Apenas backend
docker compose logs -f postgres     # Apenas database

# Restart containers
docker compose restart
docker compose restart microservice

# Stop/Start
docker compose stop
docker compose start

# Rebuild após mudanças
docker compose build --no-cache
docker compose up -d
```

### Nginx

```bash
# Status
sudo systemctl status nginx

# Testar configuração
sudo nginx -t

# Reload (sem downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backups

```bash
# Listar backups no S3
aws s3 ls s3://<BUCKET_NAME>/daily/
aws s3 ls s3://<BUCKET_NAME>/weekly/

# Executar backup manual
/opt/smartfinance/backup-postgres.sh

# Restaurar backup
cd /opt/smartfinance
./restore-postgres.sh smartfinance_backup_YYYYMMDD_HHMMSS.sql.gz

# Ver logs de backup
tail -f /opt/smartfinance/backups/backup.log
```

### Monitoramento

```bash
# Dashboard CloudWatch
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=smartfinance

# Ver alarmes
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:

# Ver métricas no terminal
aws cloudwatch get-metric-statistics \
  --namespace SmartFinance \
  --metric-name MEMORY_USED \
  --dimensions Name=Instance,Value=<INSTANCE_ID> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Health check local
/opt/smartfinance/health-check.sh
tail -f /opt/smartfinance/backups/health-check.log
```

### Gerenciamento de Recursos

```bash
# Verificar uso de RAM
free -h
docker stats --no-stream

# Verificar uso de disco
df -h
docker system df

# Limpar Docker (liberar espaço)
docker system prune -a --volumes  # CUIDADO: Remove tudo não usado!

# Limpar apenas imagens antigas
docker image prune -a

# Ver swap
swapon --show
```

---

## Troubleshooting

### Containers não iniciam (Out of Memory)

```bash
# Verificar RAM
free -h

# Se swap não estiver ativo
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Restart containers
docker compose restart
```

### Aplicação lenta

```bash
# Verificar recursos
htop

# Verificar logs de containers
docker compose logs --tail=100

# Reduzir mem_limit se necessário (editar docker-compose.yml)
# Frontend: 200 MB → 150 MB
# Microservice: 300 MB → 250 MB
# Postgres: 200 MB → 150 MB
```

### Nginx 502 Bad Gateway

```bash
# Verificar containers rodando
docker compose ps

# Verificar logs backend
docker compose logs microservice

# Verificar portas
sudo netstat -tulpn | grep -E '3000|5000'

# Testar backend direto
curl http://localhost:5000/health
curl http://localhost:3000
```

### SSL não funciona

```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Testar configuração Nginx
sudo nginx -t

# Ver logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Backup falhou

```bash
# Ver logs
tail -f /opt/smartfinance/backups/backup.log

# Verificar permissões IAM
aws s3 ls s3://<BUCKET_NAME>/

# Testar backup manual
/opt/smartfinance/backup-postgres.sh
```

### Alarmes disparando

```bash
# Disk > 80%
df -h
docker system prune -a  # Liberar espaço

# Memory > 90%
free -h
docker compose restart  # Restart para liberar memória

# Backend unhealthy
docker compose logs microservice
curl http://localhost:5000/health

# Database unhealthy
docker compose logs postgres
docker exec smartfinance_postgres pg_isready -U smartfinance
```

---

## FAQ

### 1. Quanto custa realmente?

**Ano 1 (Free Tier):** $0/mês
**Ano 2+:** ~$8-10/mês

### 2. A aplicação aguenta tráfego de produção?

Depende:
- **Baixo tráfego** (< 100 usuários simultâneos): ✅ Sim
- **Médio tráfego** (100-500 usuários): ⚠️ Pode ficar lento
- **Alto tráfego** (> 500 usuários): ❌ Precisa escalar

**Limitações:**
- 1 vCPU compartilhado
- 1 GB RAM (700 MB para containers)
- Network: 15 GB/mês free (depois $0.09/GB)

### 3. Como escalar se crescer?

**Opção 1: Upgrade vertical (mesma arquitetura)**
```bash
# Parar instância
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Mudar para t3.small (2 GB RAM)
aws ec2 modify-instance-attribute \
  --instance-id <INSTANCE_ID> \
  --instance-type t3.small

# Iniciar instância
aws ec2 start-instances --instance-ids <INSTANCE_ID>

# Custo: ~$15/mês (não Free Tier)
```

**Opção 2: RDS separado**
- EC2 t2.micro (frontend + backend)
- RDS db.t3.micro (database separado)
- Custo: ~$24/mês após Free Tier

**Opção 3: ECS Fargate + ALB**
- Migrar para ECS Fargate
- ALB para load balancing
- RDS Multi-AZ
- Custo: ~$110-147/mês (infraestrutura anterior)

### 4. É seguro para produção?

**Configurações de segurança implementadas:**
- ✅ Firewall (UFW)
- ✅ Fail2Ban (proteção SSH)
- ✅ SSL/TLS 1.2+ (Let's Encrypt)
- ✅ Security Group restritivo
- ✅ Secrets em variáveis de ambiente
- ✅ Nginx rate limiting
- ✅ S3 encryption
- ✅ Database em rede privada Docker

**Melhorias recomendadas:**
- 🔲 Whitelist IP para SSH (Security Group)
- 🔲 AWS WAF (custa $5/mês + $1/milhão requests)
- 🔲 Secrets Manager (custa após 1 secret free)
- 🔲 GuardDuty (detecta ameaças, $4/mês)

### 5. Como fazer rollback?

```bash
# 1. Restaurar backup do banco
cd /opt/smartfinance
./restore-postgres.sh <backup-antigo>.sql.gz

# 2. Fazer checkout do commit anterior
git checkout <commit-anterior>

# 3. Rebuild containers
docker compose build --no-cache
docker compose up -d
```

### 6. Posso usar PostgreSQL RDS em vez do Docker?

Sim, mas **não é Free Tier após 12 meses**:

```bash
# Criar RDS db.t3.micro
aws rds create-db-instance \
  --db-instance-identifier smartfinance-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username smartfinance \
  --master-user-password <PASSWORD> \
  --allocated-storage 20

# Atualizar .env
DATABASE_URL=postgres://smartfinance:<PASSWORD>@<RDS_ENDPOINT>:5432/smartfinance

# Remover postgres do docker-compose.yml
# Restart aplicação
docker compose up -d

# Custo: ~$16/mês após Free Tier
```

### 7. Como monitorar custos?

```bash
# Ativar Cost Explorer no Console AWS
# https://console.aws.amazon.com/billing/home#/

# Criar Budget Alert (Free)
aws budgets create-budget \
  --account-id <ACCOUNT_ID> \
  --budget file://budget.json

# budget.json:
{
  "BudgetName": "SmartFinance-Monthly",
  "BudgetLimit": {
    "Amount": "5",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### 8. Como fazer backup completo para migrar para outro servidor?

```bash
# 1. Backup do banco
/opt/smartfinance/backup-postgres.sh

# 2. Backup do código e configurações
tar czf smartfinance-full-backup.tar.gz \
  /opt/smartfinance \
  /etc/nginx/nginx.conf \
  /etc/letsencrypt

# 3. Download
scp -i smartfinance-key.pem ubuntu@<IP>:/path/to/backup.tar.gz .

# 4. No novo servidor, extrair e configurar
```

---

## Suporte

- **Issues:** [GitHub Issues](https://github.com/seu-usuario/smartfinance/issues)
- **Documentação:** `/docs`
- **Email:** seu-email@example.com

---

## Licença

Este projeto é licenciado sob a licença MIT.

---

**Criado por:** Lucas Antunes Ferreira
**Última atualização:** 2026-02-03
