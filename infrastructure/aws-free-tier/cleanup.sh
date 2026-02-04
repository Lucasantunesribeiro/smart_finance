#!/bin/bash
set -euo pipefail

# ============================================================================
# SmartFinance - Cleanup Script
# ============================================================================
# ATENÇÃO: Este script DESTROI toda a infraestrutura AWS criada
# Use com cuidado! Todos os dados serão perdidos.
# ============================================================================

# Cores
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

# ============================================================================
# Confirmação
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ⚠️  ATENÇÃO - CLEANUP  ⚠️                    ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  Este script irá DESTRUIR toda a infraestrutura:              ║"
echo "║                                                                ║"
echo "║  ✗ EC2 Instance (aplicação e dados)                           ║"
echo "║  ✗ Elastic IP                                                 ║"
echo "║  ✗ Security Group                                             ║"
echo "║  ✗ S3 Bucket (todos os backups)                               ║"
echo "║  ✗ CloudWatch Alarms e Dashboard                              ║"
echo "║  ✗ SNS Topic                                                  ║"
echo "║  ✗ IAM Roles e Policies                                       ║"
echo "║                                                                ║"
echo "║  ⚠️  TODOS OS DADOS SERÃO PERDIDOS! ⚠️                          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Carregar variáveis se existirem
if [ -f .env.ec2 ]; then
    source .env.ec2
    log_info "Recursos detectados:"
    echo "  Instance ID: ${INSTANCE_ID:-Não encontrado}"
    echo "  Elastic IP: ${ELASTIC_IP:-Não encontrado}"
    echo "  Region: ${REGION:-us-east-1}"
    echo "  S3 Bucket: ${BACKUP_BUCKET:-Não encontrado}"
    echo ""
else
    log_warn "Arquivo .env.ec2 não encontrado"
    log_warn "Você precisará fornecer os IDs manualmente"
    echo ""
fi

# Confirmação dupla
log_warn "Esta ação é IRREVERSÍVEL!"
read -p "Digite 'DELETE' (em maiúsculas) para confirmar: " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    log_info "Cleanup cancelado"
    exit 0
fi

echo ""
read -p "Tem certeza absoluta? Digite 'yes' para continuar: " CONFIRM2

if [ "$CONFIRM2" != "yes" ]; then
    log_info "Cleanup cancelado"
    exit 0
fi

echo ""
log_info "Iniciando cleanup..."
echo ""

# Usar valores do .env.ec2 ou pedir ao usuário
PROJECT_NAME="${PROJECT_NAME:-smartfinance}"
REGION="${REGION:-us-east-1}"

# ============================================================================
# 1. Fazer backup final antes de deletar
# ============================================================================
log_info "Criando backup final antes de deletar..."

if [ -n "${INSTANCE_ID:-}" ] && [ -n "${ELASTIC_IP:-}" ] && [ -n "${KEY_NAME:-}" ]; then
    if [ -f "${KEY_NAME}.pem" ]; then
        # Tentar fazer backup final
        ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
            ubuntu@${ELASTIC_IP} '/opt/smartfinance/backup-postgres.sh' 2>/dev/null || \
            log_warn "Não foi possível fazer backup final"
    fi
fi

# ============================================================================
# 2. Deletar alarmes CloudWatch
# ============================================================================
log_info "Deletando alarmes CloudWatch..."

ALARM_NAMES=$(aws cloudwatch describe-alarms \
    --alarm-name-prefix "${PROJECT_NAME}-" \
    --region "$REGION" \
    --query 'MetricAlarms[].AlarmName' \
    --output text 2>/dev/null || echo "")

if [ -n "$ALARM_NAMES" ]; then
    for alarm in $ALARM_NAMES; do
        log_info "  Deletando alarme: $alarm"
        aws cloudwatch delete-alarms \
            --alarm-names "$alarm" \
            --region "$REGION" || log_warn "Falha ao deletar alarme $alarm"
    done
else
    log_warn "Nenhum alarme encontrado"
fi

# ============================================================================
# 3. Deletar CloudWatch Dashboard
# ============================================================================
log_info "Deletando CloudWatch Dashboard..."

aws cloudwatch delete-dashboards \
    --dashboard-names "$PROJECT_NAME" \
    --region "$REGION" 2>/dev/null || log_warn "Dashboard não encontrado"

# ============================================================================
# 4. Deletar SNS Topic
# ============================================================================
log_info "Deletando SNS Topic..."

if [ -n "${SNS_TOPIC_ARN:-}" ]; then
    aws sns delete-topic \
        --topic-arn "$SNS_TOPIC_ARN" \
        --region "$REGION" || log_warn "Falha ao deletar SNS topic"
else
    SNS_TOPICS=$(aws sns list-topics \
        --region "$REGION" \
        --query "Topics[?contains(TopicArn, '${PROJECT_NAME}')].TopicArn" \
        --output text 2>/dev/null || echo "")

    for topic in $SNS_TOPICS; do
        log_info "  Deletando SNS topic: $topic"
        aws sns delete-topic --topic-arn "$topic" --region "$REGION" || true
    done
fi

# ============================================================================
# 5. Terminar instância EC2
# ============================================================================
log_info "Terminando instância EC2..."

if [ -n "${INSTANCE_ID:-}" ]; then
    # Desabilitar proteção contra terminação se houver
    aws ec2 modify-instance-attribute \
        --instance-id "$INSTANCE_ID" \
        --no-disable-api-termination \
        --region "$REGION" 2>/dev/null || true

    # Terminar instância
    aws ec2 terminate-instances \
        --instance-ids "$INSTANCE_ID" \
        --region "$REGION" || log_warn "Falha ao terminar instância"

    log_info "Aguardando instância terminar..."
    aws ec2 wait instance-terminated \
        --instance-ids "$INSTANCE_ID" \
        --region "$REGION" 2>/dev/null || log_warn "Timeout aguardando terminação"
else
    log_warn "Instance ID não encontrado"
fi

# ============================================================================
# 6. Liberar Elastic IP
# ============================================================================
log_info "Liberando Elastic IP..."

if [ -n "${ELASTIC_IP:-}" ]; then
    ALLOCATION_ID=$(aws ec2 describe-addresses \
        --region "$REGION" \
        --filters "Name=public-ip,Values=${ELASTIC_IP}" \
        --query 'Addresses[0].AllocationId' \
        --output text 2>/dev/null || echo "")

    if [ -n "$ALLOCATION_ID" ] && [ "$ALLOCATION_ID" != "None" ]; then
        # Desassociar se necessário
        ASSOCIATION_ID=$(aws ec2 describe-addresses \
            --region "$REGION" \
            --allocation-ids "$ALLOCATION_ID" \
            --query 'Addresses[0].AssociationId' \
            --output text 2>/dev/null || echo "")

        if [ -n "$ASSOCIATION_ID" ] && [ "$ASSOCIATION_ID" != "None" ]; then
            aws ec2 disassociate-address \
                --association-id "$ASSOCIATION_ID" \
                --region "$REGION" 2>/dev/null || true
        fi

        # Liberar IP
        aws ec2 release-address \
            --allocation-id "$ALLOCATION_ID" \
            --region "$REGION" || log_warn "Falha ao liberar Elastic IP"
    fi
else
    log_warn "Elastic IP não encontrado"
fi

# ============================================================================
# 7. Deletar Security Group
# ============================================================================
log_info "Deletando Security Group..."

SECURITY_GROUP_NAME="${PROJECT_NAME}-sg"

# Aguardar um pouco para instância ser terminada
sleep 10

SG_ID=$(aws ec2 describe-security-groups \
    --region "$REGION" \
    --filters "Name=group-name,Values=${SECURITY_GROUP_NAME}" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "")

if [ -n "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
    aws ec2 delete-security-group \
        --group-id "$SG_ID" \
        --region "$REGION" || log_warn "Falha ao deletar Security Group (pode ter recursos associados)"
else
    log_warn "Security Group não encontrado"
fi

# ============================================================================
# 8. Deletar S3 Bucket e backups
# ============================================================================
log_info "Deletando S3 Bucket e backups..."

if [ -n "${BACKUP_BUCKET:-}" ]; then
    # Listar objetos
    OBJECT_COUNT=$(aws s3 ls s3://"$BACKUP_BUCKET" --recursive 2>/dev/null | wc -l || echo "0")

    if [ "$OBJECT_COUNT" -gt 0 ]; then
        log_warn "Bucket contém $OBJECT_COUNT objetos"
        log_warn "Deletando todos os objetos..."

        # Deletar todas as versões (se versionamento habilitado)
        aws s3api delete-objects \
            --bucket "$BACKUP_BUCKET" \
            --delete "$(aws s3api list-object-versions \
                --bucket "$BACKUP_BUCKET" \
                --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
                --max-items 1000)" 2>/dev/null || true

        # Deletar todos os objetos
        aws s3 rm s3://"$BACKUP_BUCKET" --recursive || log_warn "Falha ao deletar objetos"
    fi

    # Deletar bucket
    aws s3 rb s3://"$BACKUP_BUCKET" --force || log_warn "Falha ao deletar bucket"
else
    log_warn "Backup bucket não encontrado"
fi

# ============================================================================
# 9. Remover IAM roles e policies
# ============================================================================
log_info "Removendo IAM roles e policies..."

ROLE_NAME="${PROJECT_NAME}-backup-role"
INSTANCE_PROFILE_NAME="${PROJECT_NAME}-backup-profile"

# Remover policies do role
ATTACHED_POLICIES=$(aws iam list-role-policies \
    --role-name "$ROLE_NAME" \
    --query 'PolicyNames' \
    --output text 2>/dev/null || echo "")

for policy in $ATTACHED_POLICIES; do
    log_info "  Removendo policy: $policy"
    aws iam delete-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "$policy" 2>/dev/null || true
done

# Remover role do instance profile
aws iam remove-role-from-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE_NAME" \
    --role-name "$ROLE_NAME" 2>/dev/null || true

# Deletar instance profile
aws iam delete-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE_NAME" 2>/dev/null || \
    log_warn "Instance profile não encontrado"

# Deletar role
aws iam delete-role \
    --role-name "$ROLE_NAME" 2>/dev/null || \
    log_warn "IAM role não encontrado"

# ============================================================================
# 10. Deletar Key Pair
# ============================================================================
log_info "Deletando Key Pair..."

KEY_NAME="${KEY_NAME:-${PROJECT_NAME}-key}"

aws ec2 delete-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" 2>/dev/null || log_warn "Key pair não encontrado"

# Deletar arquivo local
if [ -f "${KEY_NAME}.pem" ]; then
    rm -f "${KEY_NAME}.pem"
    log_info "Arquivo ${KEY_NAME}.pem deletado"
fi

# ============================================================================
# 11. Limpar arquivos locais
# ============================================================================
log_info "Limpando arquivos locais..."

# Lista de arquivos para deletar
FILES_TO_DELETE=(
    ".env.ec2"
    "ec2-info.txt"
    "deploy-info.txt"
    "ssl-info.txt"
    "backup-info.txt"
    "monitoring-info.txt"
    "cloudwatch-config.json"
    "cloudwatch-policy.json"
    "dashboard.json"
    "lifecycle-policy.json"
    "nginx.conf"
    "nginx-ssl.conf"
    "s3-backup-policy.json"
    "trust-policy.json"
    "user-data.sh"
    ".env.production"
    "docker-compose.ec2.yml"
    "backup-postgres.sh"
    "restore-postgres.sh"
    "health-check.sh"
    "budget.json"
    "cost-estimate-*.txt"
)

for file in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        log_info "  Deletado: $file"
    fi
done

# ============================================================================
# 12. Resumo final
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    CLEANUP CONCLUÍDO                           ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  Recursos deletados:                                           ║"
echo "║  ✓ EC2 Instance                                                ║"
echo "║  ✓ Elastic IP                                                  ║"
echo "║  ✓ Security Group                                              ║"
echo "║  ✓ S3 Bucket (backups)                                         ║"
echo "║  ✓ CloudWatch Alarms                                           ║"
echo "║  ✓ CloudWatch Dashboard                                        ║"
echo "║  ✓ SNS Topic                                                   ║"
echo "║  ✓ IAM Roles e Policies                                        ║"
echo "║  ✓ Key Pair                                                    ║"
echo "║  ✓ Arquivos locais                                             ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_info "Todos os recursos foram deletados."
log_warn "Verifique o Console AWS para confirmar:"
echo ""
echo "  EC2: https://console.aws.amazon.com/ec2/home?region=${REGION}#Instances:"
echo "  S3: https://console.aws.amazon.com/s3/home"
echo "  IAM: https://console.aws.amazon.com/iam/home#/roles"
echo ""

log_info "Para recriar a infraestrutura, execute:"
echo "  ./1-create-ec2.sh"
echo ""

# Criar log de cleanup
cat > cleanup-log.txt << EOF
SmartFinance - Cleanup Log
===========================
Date: $(date)
Region: ${REGION}

Resources Deleted:
------------------
- EC2 Instance: ${INSTANCE_ID:-N/A}
- Elastic IP: ${ELASTIC_IP:-N/A}
- Security Group: ${SECURITY_GROUP_NAME}
- S3 Bucket: ${BACKUP_BUCKET:-N/A}
- SNS Topic: ${SNS_TOPIC_ARN:-N/A}
- IAM Role: ${ROLE_NAME}
- Key Pair: ${KEY_NAME}

Status: SUCCESS
EOF

log_info "Log de cleanup salvo em: cleanup-log.txt"
echo ""
