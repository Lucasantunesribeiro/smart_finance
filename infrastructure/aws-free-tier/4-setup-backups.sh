#!/bin/bash
set -euo pipefail

# ============================================================================
# SmartFinance - Setup Automated Backups (PostgreSQL -> S3)
# ============================================================================
# Este script configura backups diários do PostgreSQL para S3 (Free Tier)
#
# AWS Free Tier S3:
# - 5 GB storage
# - 20,000 GET requests
# - 2,000 PUT requests
#
# Estratégia de backup:
# - Backup diário às 3h AM (horário UTC)
# - Retenção: 7 backups diários + 4 backups semanais
# - Compressão gzip (reduz ~70% do tamanho)
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
BUCKET_NAME="${PROJECT_NAME}-backups-$(date +%s)"  # Nome único
BACKUP_REGION="${REGION}"

log_info "Configurando backups automáticos..."
log_info "S3 Bucket: $BUCKET_NAME"
log_info "Região: $BACKUP_REGION"

# ============================================================================
# 1. Criar S3 bucket para backups
# ============================================================================
log_info "Criando S3 bucket..."

# Criar bucket
if [ "$BACKUP_REGION" = "us-east-1" ]; then
    # us-east-1 não precisa de LocationConstraint
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$BACKUP_REGION" || log_warn "Bucket pode já existir"
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$BACKUP_REGION" \
        --create-bucket-configuration LocationConstraint="$BACKUP_REGION" || log_warn "Bucket pode já existir"
fi

# Bloquear acesso público
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Habilitar versionamento (segurança adicional)
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

# Configurar lifecycle para deletar versões antigas após 30 dias
cat > lifecycle-policy.json << EOF
{
    "Rules": [
        {
            "Id": "DeleteOldVersions",
            "Status": "Enabled",
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 30
            }
        },
        {
            "Id": "DeleteOldBackups",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "daily/"
            },
            "Expiration": {
                "Days": 7
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET_NAME" \
    --lifecycle-configuration file://lifecycle-policy.json

# Habilitar encryption
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'

log_info "S3 bucket criado: s3://${BUCKET_NAME}"

# ============================================================================
# 2. Criar IAM role para EC2 acessar S3
# ============================================================================
log_info "Configurando permissões IAM..."

ROLE_NAME="${PROJECT_NAME}-backup-role"
POLICY_NAME="${PROJECT_NAME}-backup-policy"

# Criar trust policy
cat > trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Criar IAM role
if aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
    log_warn "IAM Role '$ROLE_NAME' já existe. Reutilizando..."
else
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file://trust-policy.json \
        --tags Key=Project,Value=smartfinance

    log_info "IAM Role criado: $ROLE_NAME"
fi

# Criar policy para acesso ao S3
cat > s3-backup-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::${BUCKET_NAME}",
                "arn:aws:s3:::${BUCKET_NAME}/*"
            ]
        }
    ]
}
EOF

# Anexar policy ao role
if aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" &> /dev/null; then
    log_warn "Policy já anexada ao role"
else
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "$POLICY_NAME" \
        --policy-document file://s3-backup-policy.json

    log_info "Policy anexada ao role"
fi

# Criar instance profile
INSTANCE_PROFILE_NAME="${PROJECT_NAME}-backup-profile"

if aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" &> /dev/null; then
    log_warn "Instance profile já existe"
else
    aws iam create-instance-profile \
        --instance-profile-name "$INSTANCE_PROFILE_NAME"

    # Adicionar role ao instance profile
    aws iam add-role-to-instance-profile \
        --instance-profile-name "$INSTANCE_PROFILE_NAME" \
        --role-name "$ROLE_NAME"

    log_info "Instance profile criado: $INSTANCE_PROFILE_NAME"

    # Aguardar propagação
    sleep 10
fi

# Associar instance profile à EC2
log_info "Associando instance profile à EC2..."

# Verificar se já tem instance profile
CURRENT_PROFILE=$(aws ec2 describe-iam-instance-profile-associations \
    --filters "Name=instance-id,Values=$INSTANCE_ID" \
    --query 'IamInstanceProfileAssociations[0].IamInstanceProfile.Arn' \
    --output text 2>/dev/null || echo "None")

if [ "$CURRENT_PROFILE" = "None" ]; then
    aws ec2 associate-iam-instance-profile \
        --instance-id "$INSTANCE_ID" \
        --iam-instance-profile Name="$INSTANCE_PROFILE_NAME"

    log_info "Instance profile associado"
    log_warn "Aguardando 30 segundos para propagação..."
    sleep 30
else
    log_warn "Instance profile já associado"
fi

# ============================================================================
# 3. Criar script de backup
# ============================================================================
log_info "Criando script de backup..."

cat > backup-postgres.sh << EOF
#!/bin/bash
set -euo pipefail

# SmartFinance - PostgreSQL Backup Script
# Executa backup do banco e envia para S3

# Configurações
BACKUP_DIR="/opt/smartfinance/backups"
S3_BUCKET="${BUCKET_NAME}"
DATE=\$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=\$(date +%u)  # 1=Monday, 7=Sunday
BACKUP_FILE="smartfinance_backup_\${DATE}.sql.gz"

# Criar diretório de backup
mkdir -p "\$BACKUP_DIR"

# Cores para log
RED='\\033[0;31m'
GREEN='\\033[0;32m'
NC='\\033[0m'

log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a "\$BACKUP_DIR/backup.log"
}

log_error() {
    echo -e "\${RED}\$(date '+%Y-%m-%d %H:%M:%S') - ERROR: \$1\${NC}" | tee -a "\$BACKUP_DIR/backup.log"
}

log_success() {
    echo -e "\${GREEN}\$(date '+%Y-%m-%d %H:%M:%S') - SUCCESS: \$1\${NC}" | tee -a "\$BACKUP_DIR/backup.log"
}

log "Iniciando backup do PostgreSQL..."

# Obter senha do banco do .env
cd /opt/smartfinance
DB_PASSWORD=\$(grep POSTGRES_PASSWORD .env | cut -d '=' -f2)

# Executar backup usando docker exec
if docker exec smartfinance_postgres pg_dump -U smartfinance smartfinance | gzip > "\$BACKUP_DIR/\$BACKUP_FILE"; then
    BACKUP_SIZE=\$(du -h "\$BACKUP_DIR/\$BACKUP_FILE" | cut -f1)
    log "Backup criado: \$BACKUP_FILE (tamanho: \$BACKUP_SIZE)"
else
    log_error "Falha ao criar backup"
    exit 1
fi

# Upload para S3 (daily/)
log "Enviando backup para S3..."
if aws s3 cp "\$BACKUP_DIR/\$BACKUP_FILE" "s3://\$S3_BUCKET/daily/\$BACKUP_FILE" --storage-class STANDARD_IA; then
    log_success "Backup enviado para s3://\$S3_BUCKET/daily/\$BACKUP_FILE"
else
    log_error "Falha ao enviar backup para S3"
    exit 1
fi

# Se for domingo (7), copiar também para weekly/
if [ "\$DAY_OF_WEEK" = "7" ]; then
    log "Domingo detectado - criando backup semanal..."
    WEEKLY_FILE="smartfinance_weekly_\${DATE}.sql.gz"
    cp "\$BACKUP_DIR/\$BACKUP_FILE" "\$BACKUP_DIR/\$WEEKLY_FILE"

    if aws s3 cp "\$BACKUP_DIR/\$WEEKLY_FILE" "s3://\$S3_BUCKET/weekly/\$WEEKLY_FILE" --storage-class STANDARD_IA; then
        log_success "Backup semanal enviado para S3"
    else
        log_error "Falha ao enviar backup semanal"
    fi
fi

# Limpar backups locais antigos (manter apenas últimos 3)
log "Limpando backups locais antigos..."
cd "\$BACKUP_DIR"
ls -t smartfinance_backup_*.sql.gz | tail -n +4 | xargs -r rm -f
log "Backups locais antigos removidos"

# Limpar backups semanais no S3 (manter apenas últimos 4)
log "Limpando backups semanais antigos no S3..."
aws s3 ls "s3://\$S3_BUCKET/weekly/" | sort -r | awk 'NR>4 {print \$4}' | while read file; do
    if [ -n "\$file" ]; then
        aws s3 rm "s3://\$S3_BUCKET/weekly/\$file"
        log "Removido: weekly/\$file"
    fi
done

log_success "Backup concluído com sucesso!"

# Estatísticas
TOTAL_BACKUPS=\$(aws s3 ls "s3://\$S3_BUCKET/daily/" --recursive | wc -l)
TOTAL_SIZE=\$(aws s3 ls "s3://\$S3_BUCKET/" --recursive --summarize | grep "Total Size" | awk '{print \$3}')
log "Total de backups no S3: \$TOTAL_BACKUPS"
log "Tamanho total no S3: \$(numfmt --to=iec \$TOTAL_SIZE 2>/dev/null || echo \$TOTAL_SIZE bytes)"
EOF

chmod +x backup-postgres.sh

# ============================================================================
# 4. Criar script de restore
# ============================================================================
log_info "Criando script de restore..."

cat > restore-postgres.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# SmartFinance - PostgreSQL Restore Script
# Restaura backup do S3 para o banco de dados

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

# Verificar argumento
if [ $# -lt 1 ]; then
    log_error "Uso: $0 <backup-file.sql.gz>"
    log_info "Exemplo: $0 smartfinance_backup_20260203_030000.sql.gz"
    echo ""
    log_info "Listar backups disponíveis:"
    aws s3 ls s3://BUCKET_NAME/daily/ --recursive
    exit 1
fi

BACKUP_FILE=$1
BACKUP_DIR="/opt/smartfinance/backups"
S3_BUCKET="BUCKET_NAME"  # Será substituído

log_warn "⚠️  ATENÇÃO: Esta operação irá SUBSTITUIR o banco de dados atual!"
log_warn "Certifique-se de ter um backup antes de prosseguir."
echo ""
read -p "Digite 'yes' para confirmar: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_error "Restore cancelado"
    exit 1
fi

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Download do S3
log_info "Baixando backup do S3..."
if aws s3 cp "s3://$S3_BUCKET/daily/$BACKUP_FILE" "$BACKUP_DIR/$BACKUP_FILE"; then
    log_info "Backup baixado: $BACKUP_FILE"
else
    log_error "Falha ao baixar backup"
    exit 1
fi

# Obter senha do banco
cd /opt/smartfinance
DB_PASSWORD=$(grep POSTGRES_PASSWORD .env | cut -d '=' -f2)

# Parar aplicação
log_info "Parando containers da aplicação..."
docker compose stop frontend microservice

# Aguardar conexões fecharem
sleep 5

# Restaurar backup
log_info "Restaurando backup..."
if gunzip -c "$BACKUP_DIR/$BACKUP_FILE" | docker exec -i smartfinance_postgres psql -U smartfinance smartfinance; then
    log_info "Backup restaurado com sucesso"
else
    log_error "Falha ao restaurar backup"
    log_warn "Iniciando containers novamente..."
    docker compose start microservice frontend
    exit 1
fi

# Reiniciar aplicação
log_info "Reiniciando aplicação..."
docker compose start microservice frontend

# Aguardar containers ficarem healthy
sleep 10

log_info "Verificando saúde da aplicação..."
if docker compose ps | grep -q "healthy"; then
    log_info "✓ Aplicação rodando"
else
    log_warn "⚠  Verificar logs: docker compose logs"
fi

log_info "Restore concluído!"
EOF

chmod +x restore-postgres.sh

# Substituir BUCKET_NAME no script de restore
sed -i "s|BUCKET_NAME|${BUCKET_NAME}|g" restore-postgres.sh

# ============================================================================
# 5. Enviar scripts para EC2 e configurar cron
# ============================================================================
log_info "Enviando scripts para EC2..."

# Enviar scripts
scp -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no \
    backup-postgres.sh restore-postgres.sh \
    ubuntu@${ELASTIC_IP}:/tmp/

# Configurar na EC2
ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << EOSSH
set -e

# Mover scripts para /opt/smartfinance
sudo mv /tmp/backup-postgres.sh /opt/smartfinance/
sudo mv /tmp/restore-postgres.sh /opt/smartfinance/
sudo chown ubuntu:ubuntu /opt/smartfinance/*.sh

# Criar diretório de backups
mkdir -p /opt/smartfinance/backups

# Configurar cron para backup diário às 3h AM (UTC)
(crontab -l 2>/dev/null || true; echo "0 3 * * * /opt/smartfinance/backup-postgres.sh >> /opt/smartfinance/backups/cron.log 2>&1") | crontab -

# Verificar crontab
echo "Crontab configurado:"
crontab -l

echo "Scripts de backup instalados com sucesso"
EOSSH

log_info "Scripts instalados e cron configurado"

# ============================================================================
# 6. Executar primeiro backup (teste)
# ============================================================================
log_info "Executando primeiro backup (teste)..."

ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << 'EOSSH'
set -e

cd /opt/smartfinance
./backup-postgres.sh

# Verificar se backup foi enviado para S3
echo ""
echo "Backups no S3:"
aws s3 ls s3://BUCKET_NAME/daily/ --recursive
EOSSH

# Substituir BUCKET_NAME
ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} \
    "aws s3 ls s3://${BUCKET_NAME}/daily/ --recursive"

log_info "Primeiro backup concluído"

# ============================================================================
# 7. Resumo final
# ============================================================================
echo ""
echo "============================================================================"
log_info "Backups automáticos configurados com sucesso!"
echo "============================================================================"
echo ""
echo "S3 Bucket: s3://${BUCKET_NAME}"
echo "Frequência: Diário às 3h AM (UTC)"
echo "Retenção:"
echo "  - Backups diários: 7 dias"
echo "  - Backups semanais: 4 semanas"
echo ""
echo "Listar backups:"
echo "  aws s3 ls s3://${BUCKET_NAME}/daily/"
echo "  aws s3 ls s3://${BUCKET_NAME}/weekly/"
echo ""
echo "Executar backup manual:"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} '/opt/smartfinance/backup-postgres.sh'"
echo ""
echo "Restaurar backup:"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP}"
echo "  cd /opt/smartfinance"
echo "  ./restore-postgres.sh <backup-file.sql.gz>"
echo ""
echo "Verificar logs de backup:"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'tail -f /opt/smartfinance/backups/backup.log'"
echo ""
echo "Custos S3 Free Tier:"
echo "  - Storage: 5 GB (primeiro ano)"
echo "  - Requests: 2,000 PUT, 20,000 GET"
echo "  - Estimativa: ~100 MB/backup × 11 backups = ~1.1 GB (dentro do Free Tier)"
echo ""
echo "============================================================================"
echo ""

# Salvar informações de backup
cat > backup-info.txt << EOF
SmartFinance - Backup Configuration
====================================

S3 Bucket: s3://${BUCKET_NAME}
Region: ${BACKUP_REGION}
Setup Date: $(date)

Backup Schedule:
----------------
- Daily: 3:00 AM UTC (via cron)
- Retention: 7 daily + 4 weekly backups

Storage Estimate:
-----------------
- ~100 MB per backup (compressed)
- ~1.1 GB total (well within 5 GB Free Tier)

List backups:
-------------
aws s3 ls s3://${BUCKET_NAME}/daily/
aws s3 ls s3://${BUCKET_NAME}/weekly/

Manual backup:
--------------
ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} '/opt/smartfinance/backup-postgres.sh'

Restore backup:
---------------
1. List backups: aws s3 ls s3://${BUCKET_NAME}/daily/
2. SSH to EC2: ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP}
3. Run restore: cd /opt/smartfinance && ./restore-postgres.sh <backup-file.sql.gz>

Check logs:
-----------
ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'tail -f /opt/smartfinance/backups/backup.log'

Verify cron:
------------
ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'crontab -l'
EOF

log_info "Informações salvas em: backup-info.txt"

# Salvar bucket name no .env.ec2
echo "BACKUP_BUCKET=$BUCKET_NAME" >> .env.ec2
