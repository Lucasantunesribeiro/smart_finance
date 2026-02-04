#!/bin/bash
set -euo pipefail

# ============================================================================
# SmartFinance - Setup CloudWatch Monitoring (Free Tier)
# ============================================================================
# Configura monitoramento básico usando CloudWatch Free Tier
#
# AWS Free Tier CloudWatch:
# - 10 métricas customizadas
# - 10 alarmes
# - 5 GB logs
# - 1,000,000 API requests
#
# Métricas monitoradas:
# - Disk usage
# - Memory usage
# - CPU usage
# - Application health
# - Docker container status
# ============================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Carregar variáveis
if [ ! -f .env.ec2 ]; then
    log_error "Arquivo .env.ec2 não encontrado. Execute ./1-create-ec2.sh primeiro"
    exit 1
fi

source .env.ec2

PROJECT_NAME="smartfinance"
ALARM_EMAIL=""

# Solicitar email para alarmes
log_warn "CloudWatch enviará alertas por email quando houver problemas"
read -p "Digite seu email para receber alertas: " ALARM_EMAIL

if [ -z "$ALARM_EMAIL" ]; then
    log_error "Email é obrigatório"
    exit 1
fi

log_info "Email para alertas: $ALARM_EMAIL"

# ============================================================================
# 1. Criar SNS topic para alarmes
# ============================================================================
log_info "Criando SNS topic para alarmes..."

SNS_TOPIC_NAME="${PROJECT_NAME}-alarms"
SNS_TOPIC_ARN=$(aws sns create-topic \
    --name "$SNS_TOPIC_NAME" \
    --region "$REGION" \
    --query 'TopicArn' \
    --output text 2>/dev/null || \
    aws sns list-topics \
        --region "$REGION" \
        --query "Topics[?contains(TopicArn, '$SNS_TOPIC_NAME')].TopicArn" \
        --output text)

log_info "SNS Topic: $SNS_TOPIC_ARN"

# Inscrever email no topic
log_info "Inscrevendo email no SNS topic..."
aws sns subscribe \
    --topic-arn "$SNS_TOPIC_ARN" \
    --protocol email \
    --notification-endpoint "$ALARM_EMAIL" \
    --region "$REGION" || log_warn "Email pode já estar inscrito"

log_warn "⚠️  IMPORTANTE: Verifique seu email e CONFIRME a inscrição no SNS!"
log_warn "Você receberá um email da AWS pedindo confirmação."

# ============================================================================
# 2. Atualizar IAM role para CloudWatch
# ============================================================================
log_info "Atualizando permissões IAM para CloudWatch..."

ROLE_NAME="${PROJECT_NAME}-backup-role"  # Role criado no script anterior

# Criar policy para CloudWatch
cat > cloudwatch-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudwatch:PutMetricData",
                "cloudwatch:GetMetricStatistics",
                "cloudwatch:ListMetrics",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Anexar policy ao role
aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "${PROJECT_NAME}-cloudwatch-policy" \
    --policy-document file://cloudwatch-policy.json

log_info "Permissões CloudWatch configuradas"

# ============================================================================
# 3. Instalar e configurar CloudWatch Agent
# ============================================================================
log_info "Instalando CloudWatch Agent na EC2..."

ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << 'EOSSH'
set -e

# Download CloudWatch Agent
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

echo "CloudWatch Agent instalado"
EOSSH

log_info "CloudWatch Agent instalado"

# ============================================================================
# 4. Criar configuração do CloudWatch Agent
# ============================================================================
log_info "Criando configuração do CloudWatch Agent..."

cat > cloudwatch-config.json << EOF
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "root"
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/opt/smartfinance/backups/backup.log",
                        "log_group_name": "/smartfinance/backups",
                        "log_stream_name": "{instance_id}",
                        "retention_in_days": 7
                    },
                    {
                        "file_path": "/var/log/nginx/error.log",
                        "log_group_name": "/smartfinance/nginx",
                        "log_stream_name": "{instance_id}-error",
                        "retention_in_days": 7
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "SmartFinance",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    {
                        "name": "cpu_usage_idle",
                        "rename": "CPU_IDLE",
                        "unit": "Percent"
                    },
                    {
                        "name": "cpu_usage_iowait",
                        "rename": "CPU_IOWAIT",
                        "unit": "Percent"
                    }
                ],
                "metrics_collection_interval": 60,
                "totalcpu": false
            },
            "disk": {
                "measurement": [
                    {
                        "name": "used_percent",
                        "rename": "DISK_USED",
                        "unit": "Percent"
                    }
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "/"
                ]
            },
            "mem": {
                "measurement": [
                    {
                        "name": "mem_used_percent",
                        "rename": "MEMORY_USED",
                        "unit": "Percent"
                    }
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    {
                        "name": "swap_used_percent",
                        "rename": "SWAP_USED",
                        "unit": "Percent"
                    }
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Enviar configuração para EC2
scp -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no \
    cloudwatch-config.json ubuntu@${ELASTIC_IP}:/tmp/

# Aplicar configuração e iniciar agent
ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << 'EOSSH'
set -e

# Mover configuração
sudo mv /tmp/cloudwatch-config.json /opt/aws/amazon-cloudwatch-agent/etc/

# Iniciar CloudWatch Agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json

# Verificar status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a query \
    -m ec2 \
    -c default

echo "CloudWatch Agent configurado e rodando"
EOSSH

log_info "CloudWatch Agent configurado"

# ============================================================================
# 5. Criar script de health check customizado
# ============================================================================
log_info "Criando script de health check..."

cat > health-check.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# SmartFinance - Health Check Script
# Verifica saúde da aplicação e envia métricas para CloudWatch

NAMESPACE="SmartFinance"
INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2)

# Função para enviar métrica
send_metric() {
    local metric_name=$1
    local value=$2
    local unit=${3:-"None"}

    aws cloudwatch put-metric-data \
        --namespace "$NAMESPACE" \
        --metric-name "$metric_name" \
        --value "$value" \
        --unit "$unit" \
        --dimensions Instance="$INSTANCE_ID" \
        --region REGION
}

# 1. Check Docker containers
CONTAINERS_RUNNING=$(docker ps --format '{{.Names}}' | grep -c smartfinance || echo 0)
EXPECTED_CONTAINERS=3

if [ "$CONTAINERS_RUNNING" -eq "$EXPECTED_CONTAINERS" ]; then
    send_metric "ContainersHealthy" 1
else
    send_metric "ContainersHealthy" 0
    echo "ERROR: Expected $EXPECTED_CONTAINERS containers, found $CONTAINERS_RUNNING"
fi

# 2. Check frontend health
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    send_metric "FrontendHealthy" 1
else
    send_metric "FrontendHealthy" 0
    echo "ERROR: Frontend não respondeu"
fi

# 3. Check backend health
if curl -f -s http://localhost:5000/health > /dev/null 2>&1; then
    send_metric "BackendHealthy" 1
else
    send_metric "BackendHealthy" 0
    echo "ERROR: Backend não respondeu"
fi

# 4. Check PostgreSQL
if docker exec smartfinance_postgres pg_isready -U smartfinance > /dev/null 2>&1; then
    send_metric "DatabaseHealthy" 1
else
    send_metric "DatabaseHealthy" 0
    echo "ERROR: PostgreSQL não respondeu"
fi

# 5. Check Nginx
if systemctl is-active --quiet nginx; then
    send_metric "NginxHealthy" 1
else
    send_metric "NginxHealthy" 0
    echo "ERROR: Nginx não está rodando"
fi

# 6. Docker disk usage
DOCKER_DISK_USAGE=$(docker system df --format "{{.Size}}" | head -1 | sed 's/[^0-9.]//g' || echo 0)
send_metric "DockerDiskUsageGB" "${DOCKER_DISK_USAGE:-0}" "Gigabytes"

echo "Health check completed at $(date)"
EOF

# Substituir REGION
sed -i "s|REGION|$REGION|g" health-check.sh
chmod +x health-check.sh

# Enviar para EC2
scp -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no \
    health-check.sh ubuntu@${ELASTIC_IP}:/tmp/

ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << 'EOSSH'
set -e

# Mover script
sudo mv /tmp/health-check.sh /opt/smartfinance/
sudo chown ubuntu:ubuntu /opt/smartfinance/health-check.sh

# Adicionar ao cron (a cada 5 minutos)
(crontab -l 2>/dev/null || true; echo "*/5 * * * * /opt/smartfinance/health-check.sh >> /opt/smartfinance/backups/health-check.log 2>&1") | crontab -

echo "Health check script instalado"
EOSSH

log_info "Health check script configurado"

# ============================================================================
# 6. Criar alarmes do CloudWatch
# ============================================================================
log_info "Criando alarmes do CloudWatch..."

# Aguardar métricas começarem a aparecer
log_info "Aguardando 2 minutos para métricas aparecerem..."
sleep 120

# Alarme: Disk usage > 80%
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-high-disk-usage" \
    --alarm-description "Disk usage above 80%" \
    --metric-name DISK_USED \
    --namespace SmartFinance \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --dimensions Name=Instance,Value="$INSTANCE_ID" \
    --region "$REGION" || log_warn "Alarme disk já existe"

# Alarme: Memory usage > 90%
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-high-memory-usage" \
    --alarm-description "Memory usage above 90%" \
    --metric-name MEMORY_USED \
    --namespace SmartFinance \
    --statistic Average \
    --period 300 \
    --threshold 90 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --dimensions Name=Instance,Value="$INSTANCE_ID" \
    --region "$REGION" || log_warn "Alarme memory já existe"

# Alarme: Backend unhealthy
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-backend-unhealthy" \
    --alarm-description "Backend health check failed" \
    --metric-name BackendHealthy \
    --namespace SmartFinance \
    --statistic Minimum \
    --period 300 \
    --threshold 1 \
    --comparison-operator LessThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --treat-missing-data notBreaching \
    --dimensions Name=Instance,Value="$INSTANCE_ID" \
    --region "$REGION" || log_warn "Alarme backend já existe"

# Alarme: Database unhealthy
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-database-unhealthy" \
    --alarm-description "Database health check failed" \
    --metric-name DatabaseHealthy \
    --namespace SmartFinance \
    --statistic Minimum \
    --period 300 \
    --threshold 1 \
    --comparison-operator LessThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --treat-missing-data notBreaching \
    --dimensions Name=Instance,Value="$INSTANCE_ID" \
    --region "$REGION" || log_warn "Alarme database já existe"

# Alarme: EC2 StatusCheckFailed
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-ec2-status-check-failed" \
    --alarm-description "EC2 instance status check failed" \
    --metric-name StatusCheckFailed \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --threshold 0 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --dimensions Name=InstanceId,Value="$INSTANCE_ID" \
    --region "$REGION" || log_warn "Alarme EC2 status já existe"

log_info "Alarmes criados"

# ============================================================================
# 7. Criar CloudWatch Dashboard
# ============================================================================
log_info "Criando CloudWatch Dashboard..."

cat > dashboard.json << EOF
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "SmartFinance", "DISK_USED", { "stat": "Average" } ],
                    [ ".", "MEMORY_USED", { "stat": "Average" } ],
                    [ ".", "SWAP_USED", { "stat": "Average" } ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "Resource Usage",
                "yAxis": {
                    "left": {
                        "min": 0,
                        "max": 100
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "SmartFinance", "FrontendHealthy", { "stat": "Minimum" } ],
                    [ ".", "BackendHealthy", { "stat": "Minimum" } ],
                    [ ".", "DatabaseHealthy", { "stat": "Minimum" } ]
                ],
                "period": 300,
                "stat": "Minimum",
                "region": "$REGION",
                "title": "Application Health",
                "yAxis": {
                    "left": {
                        "min": 0,
                        "max": 1
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/EC2", "CPUUtilization", { "stat": "Average", "dimensions": {"InstanceId": "$INSTANCE_ID"} } ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "EC2 CPU Usage"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "SmartFinance", "ContainersHealthy", { "stat": "Minimum" } ]
                ],
                "period": 300,
                "stat": "Minimum",
                "region": "$REGION",
                "title": "Docker Containers"
            }
        }
    ]
}
EOF

aws cloudwatch put-dashboard \
    --dashboard-name "$PROJECT_NAME" \
    --dashboard-body file://dashboard.json \
    --region "$REGION"

log_info "Dashboard criado"

# ============================================================================
# 8. Resumo final
# ============================================================================
echo ""
echo "============================================================================"
log_info "Monitoramento CloudWatch configurado com sucesso!"
echo "============================================================================"
echo ""
echo "SNS Topic: $SNS_TOPIC_ARN"
echo "Email de alertas: $ALARM_EMAIL"
echo ""
log_warn "⚠️  IMPORTANTE: Confirme a inscrição no SNS pelo email!"
echo ""
echo "Alarmes configurados:"
echo "  1. Disk usage > 80%"
echo "  2. Memory usage > 90%"
echo "  3. Backend unhealthy"
echo "  4. Database unhealthy"
echo "  5. EC2 status check failed"
echo ""
echo "Dashboard CloudWatch:"
echo "  https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=${PROJECT_NAME}"
echo ""
echo "Ver alarmes:"
echo "  https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#alarmsV2:"
echo ""
echo "Ver logs:"
echo "  https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#logsV2:log-groups"
echo ""
echo "Verificar métricas customizadas:"
echo "  aws cloudwatch list-metrics --namespace SmartFinance --region ${REGION}"
echo ""
echo "Métricas monitoradas (a cada 5 minutos):"
echo "  - ContainersHealthy"
echo "  - FrontendHealthy"
echo "  - BackendHealthy"
echo "  - DatabaseHealthy"
echo "  - NginxHealthy"
echo "  - DockerDiskUsageGB"
echo ""
echo "Custos CloudWatch Free Tier:"
echo "  - 10 métricas customizadas: ✓ (usando 6)"
echo "  - 10 alarmes: ✓ (usando 5)"
echo "  - 5 GB logs: ✓"
echo "  - Estimativa: \$0/mês (dentro do Free Tier)"
echo ""
echo "============================================================================"
echo ""

# Salvar informações
cat > monitoring-info.txt << EOF
SmartFinance - CloudWatch Monitoring
=====================================

SNS Topic: $SNS_TOPIC_ARN
Alert Email: $ALARM_EMAIL
Setup Date: $(date)

Dashboard:
----------
https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=${PROJECT_NAME}

Alarms:
-------
1. high-disk-usage (> 80%)
2. high-memory-usage (> 90%)
3. backend-unhealthy
4. database-unhealthy
5. ec2-status-check-failed

CloudWatch Logs:
----------------
- /smartfinance/backups (backup logs)
- /smartfinance/nginx (nginx error logs)

Custom Metrics (every 5 minutes):
----------------------------------
- ContainersHealthy (0 or 1)
- FrontendHealthy (0 or 1)
- BackendHealthy (0 or 1)
- DatabaseHealthy (0 or 1)
- NginxHealthy (0 or 1)
- DockerDiskUsageGB

List metrics:
-------------
aws cloudwatch list-metrics --namespace SmartFinance --region ${REGION}

View logs:
----------
aws logs tail /smartfinance/backups --follow --region ${REGION}
aws logs tail /smartfinance/nginx --follow --region ${REGION}

Health check logs (on EC2):
----------------------------
ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'tail -f /opt/smartfinance/backups/health-check.log'
EOF

log_info "Informações salvas em: monitoring-info.txt"

# Salvar SNS topic no .env.ec2
echo "SNS_TOPIC_ARN=$SNS_TOPIC_ARN" >> .env.ec2
echo "ALARM_EMAIL=$ALARM_EMAIL" >> .env.ec2
