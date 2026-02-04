# SmartFinance - Guia de Troubleshooting

Soluções para problemas comuns encontrados na arquitetura AWS Free Tier.

## Índice

- [Problemas de Deploy](#problemas-de-deploy)
- [Problemas de Performance](#problemas-de-performance)
- [Problemas de Rede](#problemas-de-rede)
- [Problemas de Database](#problemas-de-database)
- [Problemas de Backup](#problemas-de-backup)
- [Problemas de SSL](#problemas-de-ssl)
- [Problemas de Monitoramento](#problemas-de-monitoramento)
- [Custos Inesperados](#custos-inesperados)

---

## Problemas de Deploy

### 1. Script 1-create-ec2.sh falha com "Access Denied"

**Sintomas:**
```
An error occurred (UnauthorizedOperation) when calling the RunInstances operation
```

**Causa:** Credenciais AWS inválidas ou sem permissões

**Solução:**
```bash
# Verificar credenciais
aws sts get-caller-identity

# Reconfigurar AWS CLI
aws configure

# Verificar permissões IAM necessárias:
# - EC2:*
# - IAM:CreateRole, IAM:AttachRolePolicy
# - S3:CreateBucket, S3:PutObject
# - CloudWatch:PutMetricAlarm
# - SNS:CreateTopic
```

### 2. User data script não completa (instância não fica pronta)

**Sintomas:**
```
Timeout aguardando instância ficar pronta
```

**Causa:** User data script falhou ou está lento

**Solução:**
```bash
# SSH na instância
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Verificar logs do user data
tail -f /var/log/user-data.log
tail -f /var/log/cloud-init-output.log

# Verificar se Docker foi instalado
docker --version

# Se falhou, instalar manualmente
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Instalar Docker Compose manualmente
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Script 2-deploy-application.sh falha ao enviar código

**Sintomas:**
```
scp: Connection refused
```

**Causa:** Instância ainda não está pronta ou Security Group bloqueando SSH

**Solução:**
```bash
# Verificar Security Group
aws ec2 describe-security-groups \
  --group-names smartfinance-sg \
  --query 'SecurityGroups[0].IpPermissions'

# Verificar se porta 22 está aberta
# Se não estiver, adicionar regra:
aws ec2 authorize-security-group-ingress \
  --group-name smartfinance-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Testar conexão SSH
ssh -i smartfinance-key.pem -v ubuntu@<ELASTIC_IP>
```

### 4. Containers não iniciam após deploy

**Sintomas:**
```bash
docker compose ps
# Mostra containers em estado "Restarting" ou "Exited"
```

**Causa:** Falta de memória ou erro de configuração

**Solução:**
```bash
# SSH na instância
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Verificar logs dos containers
cd /opt/smartfinance
docker compose logs frontend
docker compose logs microservice
docker compose logs postgres

# Verificar uso de memória
free -h
docker stats --no-stream

# Se Out of Memory, adicionar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Adicionar ao fstab para persistir
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Restart containers
docker compose restart
```

### 5. Nginx retorna 502 Bad Gateway

**Sintomas:**
```bash
curl http://<ELASTIC_IP>
# 502 Bad Gateway
```

**Causa:** Containers não estão rodando ou Nginx mal configurado

**Solução:**
```bash
# Verificar se containers estão rodando
docker compose ps

# Testar backend diretamente
curl http://localhost:5000/health
curl http://localhost:3000

# Se containers não respondem, verificar logs
docker compose logs -f

# Se containers respondem mas Nginx não, verificar config
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

---

## Problemas de Performance

### 1. Aplicação muito lenta

**Sintomas:**
- Páginas demoram > 5 segundos para carregar
- API responses > 2 segundos

**Diagnóstico:**
```bash
# SSH na instância
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Verificar CPU
top
# Procure por processos usando > 80% CPU

# Verificar memória
free -h
# Se "available" < 200 MB, está sem memória

# Verificar swap
swapon --show
# Se swap usage > 50%, está usando muito swap (lento)

# Verificar I/O de disco
iostat -x 1 10
# Se %util > 80%, disk I/O é bottleneck

# Verificar containers
docker stats
# Identificar container usando muitos recursos
```

**Soluções:**

**Opção 1: Otimizar containers (Grátis)**
```bash
# Reduzir mem_limit dos containers
cd /opt/smartfinance
nano docker-compose.yml

# Ajustar:
# frontend: mem_limit: 150m (era 200m)
# microservice: mem_limit: 250m (era 300m)
# postgres: mem_limit: 150m (era 200m)

# Restart
docker compose up -d
```

**Opção 2: Limpar Docker (Grátis)**
```bash
# Liberar espaço e memória
docker system prune -a --volumes

# CUIDADO: Isso remove imagens não usadas e volumes
# Backup do banco antes!
/opt/smartfinance/backup-postgres.sh
```

**Opção 3: Upgrade instância (Custo ~$7-15/mês)**
```bash
# Parar instância
aws ec2 stop-instances --instance-ids <INSTANCE_ID>
aws ec2 wait instance-stopped --instance-ids <INSTANCE_ID>

# Mudar para t3.small (2 GB RAM)
aws ec2 modify-instance-attribute \
  --instance-id <INSTANCE_ID> \
  --instance-type '{"Value": "t3.small"}'

# Iniciar instância
aws ec2 start-instances --instance-ids <INSTANCE_ID>
```

### 2. Alto uso de CPU (> 80%)

**Causa comum:** Node.js/Next.js compilando ou muitas requisições simultâneas

**Solução:**
```bash
# Identificar processo
top
# Pressione 'P' para ordenar por CPU

# Se for Node.js, verificar logs
docker compose logs frontend --tail=100
docker compose logs microservice --tail=100

# Verificar número de workers Nginx
sudo nano /etc/nginx/nginx.conf
# Ajustar: worker_processes 1; (já está otimizado para t2.micro)

# Verificar rate limiting funcionando
sudo tail -f /var/log/nginx/access.log | grep 429
# Deve mostrar requests sendo bloqueados se houver muitas
```

### 3. Database queries lentas

**Sintomas:**
```sql
-- Queries demoram > 500ms
```

**Diagnóstico:**
```bash
# Conectar ao PostgreSQL
docker exec -it smartfinance_postgres psql -U smartfinance

# Verificar slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

# Se pg_stat_statements não está habilitado:
\dx
```

**Soluções:**
```sql
-- 1. Adicionar índices em colunas frequentemente consultadas
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- 2. Analisar plano de execução
EXPLAIN ANALYZE SELECT * FROM transactions WHERE user_id = 1;

-- 3. Vacuum e analyze
VACUUM ANALYZE;

-- 4. Ajustar configurações PostgreSQL (para t2.micro)
ALTER SYSTEM SET shared_buffers = '128MB';
ALTER SYSTEM SET effective_cache_size = '512MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Restart PostgreSQL container
-- Exit psql com \q
```

```bash
# No host, restart container
docker compose restart postgres
```

---

## Problemas de Rede

### 1. Não consigo acessar aplicação pelo Elastic IP

**Sintomas:**
```bash
curl http://<ELASTIC_IP>
# Connection timeout
```

**Diagnóstico:**
```bash
# 1. Verificar se Elastic IP está associado
aws ec2 describe-addresses \
  --filters "Name=instance-id,Values=<INSTANCE_ID>"

# 2. Verificar Security Group
aws ec2 describe-security-groups \
  --group-names smartfinance-sg \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`80` || FromPort==`443`]'

# 3. Verificar Nginx rodando
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP> 'sudo systemctl status nginx'
```

**Soluções:**
```bash
# Se Elastic IP não está associado:
aws ec2 associate-address \
  --instance-id <INSTANCE_ID> \
  --allocation-id <ALLOCATION_ID>

# Se Security Group não tem regra HTTP:
aws ec2 authorize-security-group-ingress \
  --group-name smartfinance-sg \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Se Nginx não está rodando:
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Data Transfer excedendo Free Tier (> 15 GB/mês)

**Sintomas:**
```
AWS Cost Explorer mostra custos em "Data Transfer Out"
```

**Diagnóstico:**
```bash
# Verificar logs de acesso Nginx para identificar tráfego
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Tráfego por IP
sudo cat /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# Tráfego por endpoint
sudo cat /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -20

# Total de bytes transferidos hoje
sudo cat /var/log/nginx/access.log | awk '{sum+=$10} END {print sum/1024/1024 " MB"}'
```

**Soluções:**
```bash
# 1. Habilitar compressão Gzip (já configurado por padrão)
sudo nano /etc/nginx/nginx.conf
# Verificar: gzip on;

# 2. Configurar cache de static assets
# (já configurado em /_next/static)

# 3. Bloquear IPs suspeitos (muito tráfego)
sudo ufw deny from <IP_SUSPEITO>

# 4. Adicionar rate limiting mais agressivo
sudo nano /etc/nginx/nginx.conf
# Ajustar: rate=5r/s (em vez de 10r/s)
```

### 3. SSL não funciona (HTTPS timeout)

**Sintomas:**
```bash
curl https://<DOMAIN>
# Connection timeout
```

**Diagnóstico:**
```bash
# 1. Verificar porta 443 no Security Group
aws ec2 describe-security-groups \
  --group-names smartfinance-sg \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`443`]'

# 2. Verificar Nginx escutando porta 443
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>
sudo netstat -tulpn | grep :443

# 3. Verificar certificado SSL
sudo certbot certificates
```

**Soluções:**
```bash
# Se porta 443 não está aberta:
aws ec2 authorize-security-group-ingress \
  --group-name smartfinance-sg \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Se certificado expirado:
sudo certbot renew --force-renewal

# Se Nginx não está configurado para SSL:
# Re-executar script 3-setup-ssl.sh
```

---

## Problemas de Database

### 1. PostgreSQL container não inicia

**Sintomas:**
```bash
docker compose ps
# postgres: Restarting
```

**Diagnóstico:**
```bash
docker compose logs postgres

# Erros comuns:
# - "FATAL: data directory has wrong ownership"
# - "FATAL: could not create shared memory segment"
# - "out of memory"
```

**Soluções:**

**Erro de ownership:**
```bash
docker compose down
sudo chown -R 999:999 /var/lib/docker/volumes/<VOLUME_NAME>/_data
docker compose up -d
```

**Erro de shared memory:**
```bash
# Editar docker-compose.yml
nano /opt/smartfinance/docker-compose.yml

# Adicionar em postgres service:
shm_size: '256mb'

docker compose up -d
```

**Out of memory:**
```bash
# Reduzir mem_limit
nano /opt/smartfinance/docker-compose.yml
# postgres: mem_limit: 150m (era 200m)

# Adicionar swap se não tiver
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

docker compose restart
```

### 2. Conexão com banco recusada

**Sintomas:**
```
Error: Connection refused - connect(2) for "postgres" port 5432
```

**Diagnóstico:**
```bash
# Verificar container rodando
docker compose ps postgres

# Verificar porta
docker compose exec postgres pg_isready -U smartfinance

# Verificar rede Docker
docker network inspect smartfinance_network
```

**Soluções:**
```bash
# Restart PostgreSQL
docker compose restart postgres

# Se ainda falhar, verificar .env
cat /opt/smartfinance/.env | grep DATABASE_URL
# Deve ser: postgres://smartfinance:PASSWORD@postgres:5432/smartfinance

# Verificar se backend está na mesma rede
docker compose config | grep networks -A 5

# Recrear rede se necessário
docker compose down
docker compose up -d
```

### 3. Database corrupto após crash

**Sintomas:**
```
FATAL: database is corrupted
```

**Solução:**
```bash
# Parar containers
docker compose stop frontend microservice

# Tentar recovery automático
docker compose exec postgres pg_resetwal -f /var/lib/postgresql/data

# Se falhar, restaurar do backup
cd /opt/smartfinance
./restore-postgres.sh <ultimo-backup>.sql.gz

# Se não tiver backup, criar novo banco
docker compose down -v  # CUIDADO: Remove volume
docker compose up -d
```

---

## Problemas de Backup

### 1. Backup falha com "Access Denied" ao enviar para S3

**Sintomas:**
```
upload failed: ./backup.sql.gz to s3://bucket/backup.sql.gz
Access Denied
```

**Causa:** IAM role não tem permissões para S3

**Solução:**
```bash
# Verificar IAM role associado à EC2
aws ec2 describe-iam-instance-profile-associations \
  --filters "Name=instance-id,Values=<INSTANCE_ID>"

# Verificar policies do role
aws iam list-role-policies --role-name smartfinance-backup-role

# Se policy não existe, re-executar script 4-setup-backups.sh
# ou adicionar policy manualmente:
cat > s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
    "Resource": ["arn:aws:s3:::BUCKET_NAME/*", "arn:aws:s3:::BUCKET_NAME"]
  }]
}
EOF

aws iam put-role-policy \
  --role-name smartfinance-backup-role \
  --policy-name s3-backup-access \
  --policy-document file://s3-policy.json
```

### 2. Backup não executa automaticamente (cron não roda)

**Sintomas:**
```bash
# Não há novos backups no S3
aws s3 ls s3://<BUCKET>/daily/
# Último backup é de vários dias atrás
```

**Diagnóstico:**
```bash
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Verificar crontab
crontab -l
# Deve ter: 0 3 * * * /opt/smartfinance/backup-postgres.sh

# Verificar logs do cron
tail -f /opt/smartfinance/backups/cron.log

# Verificar permissões do script
ls -l /opt/smartfinance/backup-postgres.sh
# Deve ser: -rwxr-xr-x
```

**Soluções:**
```bash
# Adicionar cron job manualmente
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/smartfinance/backup-postgres.sh >> /opt/smartfinance/backups/cron.log 2>&1") | crontab -

# Ajustar permissões
chmod +x /opt/smartfinance/backup-postgres.sh

# Testar script manualmente
/opt/smartfinance/backup-postgres.sh

# Verificar serviço cron rodando
sudo systemctl status cron
sudo systemctl restart cron
```

### 3. Restore falha: "role does not exist"

**Sintomas:**
```
ERROR: role "smartfinance" does not exist
```

**Solução:**
```bash
# Criar role manualmente antes do restore
docker exec -it smartfinance_postgres psql -U postgres << 'EOF'
CREATE ROLE smartfinance WITH LOGIN PASSWORD 'sua-senha';
CREATE DATABASE smartfinance OWNER smartfinance;
\q
EOF

# Depois executar restore
./restore-postgres.sh <backup-file>.sql.gz
```

---

## Problemas de SSL

### 1. Certbot falha: "Too many requests"

**Sintomas:**
```
Error: too many failed authorizations recently
```

**Causa:** Let's Encrypt rate limit (5 falhas/hora)

**Solução:**
```bash
# Aguardar 1 hora e tentar novamente

# Enquanto isso, testar com staging environment
sudo certbot certonly \
  --staging \
  --standalone \
  -d seu-dominio.com \
  --non-interactive \
  --agree-tos \
  --email seu-email@example.com

# Se staging funcionar, remover staging após 1 hora
sudo certbot delete --cert-name seu-dominio.com
sudo certbot certonly --standalone -d seu-dominio.com ...
```

### 2. SSL auto-renewal não funciona

**Sintomas:**
```
# Certificado expira e não renova automaticamente
sudo certbot certificates
# Expiry date: 2026-01-01 (EXPIRED)
```

**Diagnóstico:**
```bash
# Verificar timer systemd
sudo systemctl status certbot.timer

# Verificar últimas execuções
sudo journalctl -u certbot.service | tail -50
```

**Soluções:**
```bash
# Habilitar timer se não estiver ativo
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Testar renewal manualmente
sudo certbot renew --dry-run

# Se falhar, verificar Nginx rodando
sudo systemctl status nginx

# Renovar forçado
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### 3. Mixed content warnings (HTTP + HTTPS)

**Sintomas:**
```
Browser console: "Mixed Content: The page was loaded over HTTPS,
but requested an insecure resource 'http://...'"
```

**Solução:**
```bash
# Atualizar .env para usar HTTPS
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>
cd /opt/smartfinance

sudo nano .env
# Alterar:
NEXT_PUBLIC_API_URL=https://seu-dominio.com/api/v1
NEXT_PUBLIC_SIGNALR_URL=https://seu-dominio.com/financehub
COOKIE_SECURE=true

# Restart containers
docker compose restart
```

---

## Problemas de Monitoramento

### 1. CloudWatch não recebe métricas

**Sintomas:**
```bash
aws cloudwatch list-metrics --namespace SmartFinance
# Retorna vazio ou métricas antigas
```

**Diagnóstico:**
```bash
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Verificar CloudWatch Agent rodando
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a query -m ec2 -c default

# Verificar logs do agent
sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

**Soluções:**
```bash
# Restart CloudWatch Agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a stop -m ec2
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json

# Verificar permissões IAM
# Role deve ter cloudwatch:PutMetricData
aws iam get-role-policy \
  --role-name smartfinance-backup-role \
  --policy-name smartfinance-cloudwatch-policy
```

### 2. Health check script não executa

**Sintomas:**
```bash
# Métricas CustomHealthy não aparecem no CloudWatch
```

**Diagnóstico:**
```bash
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Verificar crontab
crontab -l | grep health-check

# Executar manualmente
/opt/smartfinance/health-check.sh

# Verificar logs
tail -f /opt/smartfinance/backups/health-check.log
```

**Soluções:**
```bash
# Adicionar ao cron se não existir
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/smartfinance/health-check.sh >> /opt/smartfinance/backups/health-check.log 2>&1") | crontab -

# Ajustar permissões
chmod +x /opt/smartfinance/health-check.sh

# Instalar ec2-metadata se não tiver
sudo apt-get install -y cloud-utils
```

### 3. Alarmes não enviam email

**Sintomas:**
```
CloudWatch alarme dispara mas não recebo email
```

**Causa:** Inscrição SNS não foi confirmada

**Solução:**
```bash
# Verificar status da inscrição
aws sns list-subscriptions-by-topic \
  --topic-arn <SNS_TOPIC_ARN>

# Se status: PendingConfirmation
# Verificar seu email e clicar no link de confirmação

# Reenviar confirmação
aws sns subscribe \
  --topic-arn <SNS_TOPIC_ARN> \
  --protocol email \
  --notification-endpoint seu-email@example.com

# Testar alarme manualmente
aws cloudwatch set-alarm-state \
  --alarm-name smartfinance-high-disk-usage \
  --state-value ALARM \
  --state-reason "Testing alarm"
```

---

## Custos Inesperados

### 1. Fatura AWS maior que esperado

**Diagnóstico:**
```bash
# Executar script de estimativa de custos
./estimate-costs.sh

# Acessar AWS Cost Explorer
# https://console.aws.amazon.com/cost-management/home

# Verificar custos por serviço
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

**Causas comuns:**

**1. Data Transfer > 15 GB**
```bash
# Solução: Reduzir tráfego
# - Habilitar Gzip (já configurado)
# - Adicionar CloudFront (Free Tier: 1 TB out)
# - Bloquear IPs suspeitos
```

**2. Multiple EC2 instances**
```bash
# Verificar instâncias rodando
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,LaunchTime]'

# Terminar instâncias não utilizadas
aws ec2 terminate-instances --instance-ids <OLD_INSTANCE_ID>
```

**3. Elastic IP não associado**
```bash
# Elastic IP não associado custa $0.005/hora
aws ec2 describe-addresses \
  --filters "Name=instance-id,Values="

# Associar ou liberar
aws ec2 associate-address --instance-id <ID> --allocation-id <ALLOC_ID>
# OU
aws ec2 release-address --allocation-id <ALLOC_ID>
```

**4. EBS Snapshots não deletados**
```bash
# Listar snapshots
aws ec2 describe-snapshots --owner-ids self

# Deletar snapshots antigos
aws ec2 delete-snapshot --snapshot-id <SNAPSHOT_ID>
```

**5. S3 buckets com muito storage**
```bash
# Verificar tamanho dos buckets
aws s3 ls | while read bucket; do
  echo "Bucket: $bucket"
  aws s3 ls s3://$bucket --recursive --summarize | grep "Total Size"
done

# Deletar backups antigos manualmente
aws s3 rm s3://<BUCKET>/daily/ --recursive --exclude "*" --include "smartfinance_backup_202601*"
```

### 2. Free Tier expirou sem aviso

**Prevenção:**
```bash
# Configurar Budget Alert
cat > budget.json << 'EOF'
{
  "BudgetLimit": {
    "Amount": "5",
    "Unit": "USD"
  },
  "BudgetName": "SmartFinance-Monthly",
  "BudgetType": "COST",
  "TimeUnit": "MONTHLY"
}
EOF

aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json \
  --notifications-with-subscribers \
    '[{
      "Notification": {
        "ComparisonOperator": "GREATER_THAN",
        "NotificationType": "ACTUAL",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{
        "Address": "seu-email@example.com",
        "SubscriptionType": "EMAIL"
      }]
    }]'
```

---

## Comandos Úteis de Emergência

### Restart completo da aplicação
```bash
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>
cd /opt/smartfinance
docker compose down
docker compose up -d
sudo systemctl restart nginx
```

### Backup emergencial antes de manutenção
```bash
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>
/opt/smartfinance/backup-postgres.sh
```

### Liberar espaço em disco crítico
```bash
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Liberar logs antigos
sudo journalctl --vacuum-time=7d

# Limpar Docker
docker system prune -a --volumes  # CUIDADO!

# Limpar APT cache
sudo apt-get clean
sudo apt-get autoclean
```

### Rollback para versão anterior
```bash
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>
cd /opt/smartfinance

# Listar commits
git log --oneline -10

# Checkout para commit anterior
git checkout <commit-hash>

# Rebuild e restart
docker compose build --no-cache
docker compose up -d
```

### Destruir tudo e recomeçar
```bash
# No seu computador local
cd infrastructure/aws-free-tier
./cleanup.sh

# Aguardar 5 minutos para tudo ser deletado

# Recriar do zero
./1-create-ec2.sh
# ... seguir os passos normalmente
```

---

## Recursos Adicionais

- **AWS Support:** https://console.aws.amazon.com/support
- **AWS Free Tier FAQ:** https://aws.amazon.com/free/free-tier-faqs/
- **Docker Documentation:** https://docs.docker.com/
- **PostgreSQL Troubleshooting:** https://www.postgresql.org/docs/15/
- **Nginx Documentation:** https://nginx.org/en/docs/

---

**Última atualização:** 2026-02-03
