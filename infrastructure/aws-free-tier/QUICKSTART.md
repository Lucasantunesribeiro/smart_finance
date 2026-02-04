# SmartFinance AWS Free Tier - Quick Start Guide

Deploy completo do SmartFinance na AWS com **CUSTO ZERO** (ou próximo disso).

## TL;DR (Resumo Executivo)

```bash
# 1. Clone/navegue para o projeto
cd infrastructure/aws-free-tier

# 2. Execute os scripts em ordem
./1-create-ec2.sh          # 15 min - Cria infraestrutura
./2-deploy-application.sh  # 20 min - Deploy da aplicação
./3-setup-ssl.sh seu-dominio.com seu-email@example.com  # 15 min - HTTPS (opcional)
./4-setup-backups.sh       # 10 min - Backups automáticos
./5-setup-monitoring.sh    # 10 min - CloudWatch + alertas

# Pronto! Aplicação rodando em http://<ELASTIC_IP>
```

**Custo:**
- **Ano 1 (Free Tier):** $0/mês ✅
- **Ano 2+:** ~$9/mês

---

## Pré-requisitos (5 minutos)

### 1. Conta AWS
- ✅ Conta AWS criada (https://aws.amazon.com)
- ✅ Free Tier ativo (< 12 meses de uso)

### 2. AWS CLI Configurado
```bash
# Instalar
pip install awscli

# Configurar (use suas credenciais IAM)
aws configure
# AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name: us-east-1
# Default output format: json

# Testar
aws sts get-caller-identity
```

### 3. Ferramentas Locais
```bash
# Verificar (devem estar instalados)
which ssh
which scp
which tar
```

---

## Passo a Passo Completo

### Passo 1: Criar EC2 Instance (15 min)

```bash
cd infrastructure/aws-free-tier
chmod +x *.sh

./1-create-ec2.sh
```

**O que acontece:**
- ✅ Cria EC2 t2.micro Ubuntu 22.04
- ✅ Aloca Elastic IP gratuito
- ✅ Configura Security Group (HTTP/HTTPS/SSH)
- ✅ Instala Docker, Docker Compose, AWS CLI
- ✅ Configura swap de 2 GB
- ✅ Configura Fail2Ban + UFW firewall

**Output esperado:**
```
============================================================================
EC2 Instance criada com sucesso!
============================================================================

Elastic IP: 54.123.45.67
Instance ID: i-0123456789abcdef0

Conectar via SSH (aguarde 5 minutos):
  ssh -i smartfinance-key.pem ubuntu@54.123.45.67

Próximo passo:
  ./2-deploy-application.sh
============================================================================
```

**Aguardar 5 minutos** para user-data script completar.

---

### Passo 2: Deploy da Aplicação (20 min)

```bash
./2-deploy-application.sh
```

**O que acontece:**
- ✅ Configura Nginx reverse proxy
- ✅ Envia código (frontend + backend + microservice)
- ✅ Gera secrets seguros (JWT, passwords)
- ✅ Cria docker-compose.ec2.yml otimizado
- ✅ Build e inicia containers
- ✅ Configura auto-start com systemd

**Output esperado:**
```
============================================================================
Deploy concluído com sucesso!
============================================================================

URL da aplicação: http://54.123.45.67

Testar endpoints:
  Frontend:  curl http://54.123.45.67/
  Backend:   curl http://54.123.45.67/api/v1/health
  Nginx:     curl http://54.123.45.67/health

Verificar logs:
  ssh -i smartfinance-key.pem ubuntu@54.123.45.67
  cd /opt/smartfinance
  docker compose logs -f
============================================================================
```

**Testar no browser:**
```
http://54.123.45.67
```

---

### Passo 3: Configurar SSL/HTTPS (15 min, OPCIONAL)

**Requer:** Domínio apontando para o Elastic IP

```bash
# 1. Configurar DNS A record
# Nome: smartfinance.exemplo.com
# Tipo: A
# Valor: 54.123.45.67

# 2. Aguardar propagação DNS (1-5 minutos)
dig +short smartfinance.exemplo.com
# Deve retornar: 54.123.45.67

# 3. Executar script
./3-setup-ssl.sh smartfinance.exemplo.com seu-email@example.com
```

**O que acontece:**
- ✅ Instala Certbot
- ✅ Obtém certificado SSL gratuito (Let's Encrypt)
- ✅ Configura Nginx com SSL/TLS 1.2+
- ✅ Configura redirect HTTP → HTTPS
- ✅ Configura auto-renewal (90 dias)

**Output esperado:**
```
============================================================================
SSL/HTTPS configurado com sucesso!
============================================================================

URL segura: https://smartfinance.exemplo.com

Certificado:
  Emissor: Let's Encrypt
  Válido por: 90 dias
  Auto-renewal: Configurado

Testar SSL:
  curl -I https://smartfinance.exemplo.com
============================================================================
```

---

### Passo 4: Configurar Backups (10 min)

```bash
./4-setup-backups.sh
```

**O que acontece:**
- ✅ Cria S3 bucket com encryption
- ✅ Configura IAM role para EC2 → S3
- ✅ Instala script de backup PostgreSQL
- ✅ Configura cron job (diário 3h AM UTC)
- ✅ Retenção: 7 backups diários + 4 semanais
- ✅ Executa primeiro backup (teste)

**Output esperado:**
```
============================================================================
Backups automáticos configurados com sucesso!
============================================================================

S3 Bucket: s3://smartfinance-backups-1738597200
Frequência: Diário às 3h AM (UTC)
Retenção:
  - Backups diários: 7 dias
  - Backups semanais: 4 semanas

Listar backups:
  aws s3 ls s3://smartfinance-backups-1738597200/daily/

Executar backup manual:
  ssh -i smartfinance-key.pem ubuntu@54.123.45.67
  /opt/smartfinance/backup-postgres.sh
============================================================================
```

---

### Passo 5: Configurar Monitoramento (10 min)

```bash
./5-setup-monitoring.sh
```

**Você precisará fornecer:**
- Email para receber alertas

**O que acontece:**
- ✅ Configura CloudWatch Agent
- ✅ Métricas customizadas (CPU, RAM, disk, app health)
- ✅ 5 alarmes (disk > 80%, memory > 90%, app unhealthy)
- ✅ Dashboard CloudWatch
- ✅ SNS topic para email alerts
- ✅ Health check script (a cada 5 minutos)

**Output esperado:**
```
============================================================================
Monitoramento CloudWatch configurado com sucesso!
============================================================================

SNS Topic: arn:aws:sns:us-east-1:123456789012:smartfinance-alarms
Email de alertas: seu-email@example.com

⚠️  IMPORTANTE: Confirme a inscrição no SNS pelo email!

Alarmes configurados:
  1. Disk usage > 80%
  2. Memory usage > 90%
  3. Backend unhealthy
  4. Database unhealthy
  5. EC2 status check failed

Dashboard CloudWatch:
  https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=smartfinance
============================================================================
```

**⚠️ IMPORTANTE:** Verifique seu email e confirme a inscrição SNS!

---

## Verificação Final

### 1. Testar Aplicação

```bash
# Frontend
curl http://54.123.45.67/
# Deve retornar HTML

# Backend Health
curl http://54.123.45.67/api/v1/health
# Deve retornar: {"status":"healthy"}

# Nginx Health
curl http://54.123.45.67/health
# Deve retornar: healthy
```

### 2. Verificar Containers Rodando

```bash
ssh -i smartfinance-key.pem ubuntu@54.123.45.67

docker compose ps
# Deve mostrar 3 containers: frontend, microservice, postgres
# Todos com status "Up" e "healthy"

docker compose logs --tail=20
# Deve mostrar logs sem erros críticos
```

### 3. Verificar Recursos

```bash
# Memória
free -h
# Deve ter ~200-300 MB available

# Disco
df -h
# / deve ter ~60-70% usado

# Swap
swapon --show
# Deve mostrar 2 GB swap
```

### 4. Verificar Backups

```bash
aws s3 ls s3://smartfinance-backups-XXXXXXXXXX/daily/
# Deve listar pelo menos 1 backup
```

### 5. Verificar CloudWatch

```bash
aws cloudwatch list-metrics --namespace SmartFinance
# Deve listar 6 métricas customizadas
```

---

## Gestão Diária

### Acessar Aplicação
```
http://54.123.45.67
# ou
https://seu-dominio.com (se configurou SSL)
```

### SSH na Instância
```bash
ssh -i smartfinance-key.pem ubuntu@54.123.45.67
```

### Ver Logs
```bash
ssh -i smartfinance-key.pem ubuntu@54.123.45.67
cd /opt/smartfinance
docker compose logs -f              # Todos
docker compose logs -f frontend     # Apenas frontend
docker compose logs -f microservice # Apenas backend
docker compose logs -f postgres     # Apenas database
```

### Restart Aplicação
```bash
ssh -i smartfinance-key.pem ubuntu@54.123.45.67
cd /opt/smartfinance
docker compose restart
```

### Fazer Backup Manual
```bash
ssh -i smartfinance-key.pem ubuntu@54.123.45.67
/opt/smartfinance/backup-postgres.sh
```

### Ver Status dos Containers
```bash
ssh -i smartfinance-key.pem ubuntu@54.123.45.67
docker compose ps
docker stats --no-stream
```

---

## Custos Mensais Estimados

### Ano 1 (Free Tier Ativo): **$0/mês** ✅

| Recurso | Free Tier | Uso | Custo |
|---------|-----------|-----|-------|
| EC2 t2.micro | 750h/mês | 730h | $0 |
| EBS 20 GB | 30 GB | 20 GB | $0 |
| S3 | 5 GB | ~1 GB | $0 |
| Data Transfer | 15 GB out | ~5 GB | $0 |
| CloudWatch | 10 métricas | 6 métricas | $0 |
| **TOTAL** | | | **$0** |

### Ano 2+ (Free Tier Expirado): **~$9/mês**

| Recurso | Preço | Uso | Custo |
|---------|-------|-----|-------|
| EC2 t2.micro | $0.0116/hora | 730h | $8.47 |
| EBS 20 GB | $0.08/GB | 20 GB | $1.60 |
| S3 | $0.023/GB | 1 GB | $0.03 |
| Data Transfer | $0.09/GB | 5 GB | $0.45 |
| CloudWatch | Always Free | 6 métricas | $0 |
| **TOTAL** | | | **$10.55** |

**Comparação:**
- Lightsail $5: 512 MB RAM (metade)
- ECS + RDS: $110-147/mês (11-15x mais caro)

---

## Troubleshooting Rápido

### Containers não iniciam
```bash
ssh -i smartfinance-key.pem ubuntu@<IP>
free -h  # Verificar memória
docker compose logs  # Ver erros
```

### 502 Bad Gateway
```bash
docker compose ps  # Verificar containers rodando
curl http://localhost:5000/health  # Testar backend
sudo systemctl restart nginx  # Restart Nginx
```

### Out of Memory
```bash
# Adicionar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
docker compose restart
```

### Aplicação lenta
```bash
# Limpar Docker
docker system prune -a
# ou upgrade instância para t3.small
```

**Para mais troubleshooting:** Ver `TROUBLESHOOTING.md`

---

## Próximos Passos (Opcional)

### 1. Configurar Domínio Personalizado
- Comprar domínio (Namecheap, GoDaddy, Route53)
- Apontar A record para Elastic IP
- Executar `./3-setup-ssl.sh`

### 2. Configurar Budget Alert
```bash
# Ser notificado se custo > $5/mês
# https://console.aws.amazon.com/billing/home#/budgets
```

### 3. Configurar CloudFront (CDN)
- Melhor performance global
- Free Tier: 1 TB data transfer
- Cache de static assets

### 4. Migrar para RDS (Database Separado)
- Backups automáticos AWS
- Multi-AZ para HA
- Custo: +$16/mês após Free Tier

---

## Recursos

- **README Completo:** `README.md`
- **Arquitetura:** `ARCHITECTURE.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Estimar Custos:** `./estimate-costs.sh`
- **Destruir Tudo:** `./cleanup.sh`

---

## Suporte

- **GitHub Issues:** https://github.com/seu-usuario/smartfinance/issues
- **AWS Support:** https://console.aws.amazon.com/support
- **AWS Free Tier FAQ:** https://aws.amazon.com/free/free-tier-faqs/

---

**Criado por:** Lucas Antunes Ferreira
**Data:** 2026-02-03
**Licença:** MIT

---

## Checklist de Conclusão

- [ ] Script 1 executado: EC2 criada
- [ ] Script 2 executado: Aplicação deployada
- [ ] Script 3 executado (opcional): SSL configurado
- [ ] Script 4 executado: Backups configurados
- [ ] Script 5 executado: Monitoramento configurado
- [ ] Email SNS confirmado
- [ ] Aplicação acessível via browser
- [ ] Budget Alert configurado (opcional)
- [ ] Documentação revisada

**Parabéns! Sua aplicação está rodando na AWS com custo ZERO! 🎉**
