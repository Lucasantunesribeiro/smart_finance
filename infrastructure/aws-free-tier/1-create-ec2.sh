#!/bin/bash
set -euo pipefail

# ============================================================================
# SmartFinance - AWS Free Tier EC2 Setup
# ============================================================================
# Este script cria uma instância EC2 t2.micro (Free Tier) com todos os recursos
# necessários: VPC, Security Group, Key Pair, Elastic IP
#
# Custo estimado: $0/mês no Free Tier (12 meses)
#
# Pré-requisitos:
# - AWS CLI instalado e configurado (aws configure)
# - Conta AWS com Free Tier ativo
# ============================================================================

# Configurações
PROJECT_NAME="smartfinance"
REGION="us-east-1"  # Região com melhor Free Tier coverage
INSTANCE_TYPE="t3.micro"  # Free Tier: 750 horas/mês
AMI_ID=""  # Será detectado automaticamente (Ubuntu 22.04 LTS)
KEY_NAME="${PROJECT_NAME}-key"
SECURITY_GROUP_NAME="${PROJECT_NAME}-sg"
VOLUME_SIZE=20  # GB - Free Tier: até 30 GB

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funções auxiliares
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI não encontrado. Instale com: pip install awscli"
    exit 1
fi

# Verificar credenciais AWS
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "Credenciais AWS inválidas. Execute: aws configure"
    exit 1
fi

log_info "AWS Account ID: $(aws sts get-caller-identity --query Account --output text)"
log_info "Região: $REGION"

# ============================================================================
# 1. Detectar AMI Ubuntu 22.04 LTS mais recente
# ============================================================================
log_info "Detectando AMI Ubuntu 22.04 LTS..."
AMI_ID=$(aws ec2 describe-images \
    --region "$REGION" \
    --owners 099720109477 \
    --filters \
        "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
        "Name=state,Values=available" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text)

if [ -z "$AMI_ID" ] || [ "$AMI_ID" == "None" ]; then
    log_error "Falha ao detectar AMI Ubuntu 22.04"
    exit 1
fi

log_info "AMI detectado: $AMI_ID"

# ============================================================================
# 2. Criar Key Pair para SSH
# ============================================================================
log_info "Criando Key Pair..."
if aws ec2 describe-key-pairs --region "$REGION" --key-names "$KEY_NAME" &> /dev/null; then
    log_warn "Key Pair '$KEY_NAME' já existe. Reutilizando..."
else
    aws ec2 create-key-pair \
        --region "$REGION" \
        --key-name "$KEY_NAME" \
        --query 'KeyMaterial' \
        --output text > "${KEY_NAME}.pem"

    chmod 400 "${KEY_NAME}.pem"
    log_info "Key Pair criado: ${KEY_NAME}.pem (guarde este arquivo!)"
fi

# ============================================================================
# 3. Obter VPC padrão
# ============================================================================
log_info "Obtendo VPC padrão..."
VPC_ID=$(aws ec2 describe-vpcs \
    --region "$REGION" \
    --filters "Name=isDefault,Values=true" \
    --query 'Vpcs[0].VpcId' \
    --output text)

if [ -z "$VPC_ID" ] || [ "$VPC_ID" == "None" ]; then
    log_error "VPC padrão não encontrada. Crie uma VPC primeiro."
    exit 1
fi

log_info "VPC ID: $VPC_ID"

# ============================================================================
# 4. Criar Security Group
# ============================================================================
log_info "Criando Security Group..."
if aws ec2 describe-security-groups --region "$REGION" --group-names "$SECURITY_GROUP_NAME" &> /dev/null; then
    log_warn "Security Group '$SECURITY_GROUP_NAME' já existe. Reutilizando..."
    SG_ID=$(aws ec2 describe-security-groups \
        --region "$REGION" \
        --group-names "$SECURITY_GROUP_NAME" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
else
    SG_ID=$(aws ec2 create-security-group \
        --region "$REGION" \
        --group-name "$SECURITY_GROUP_NAME" \
        --description "SmartFinance Free Tier security group" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' \
        --output text)

    log_info "Security Group criado: $SG_ID"

    # Adicionar regras de ingress
    log_info "Configurando regras de firewall..."

    # HTTP (80)
    aws ec2 authorize-security-group-ingress \
        --region "$REGION" \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --tag-specifications "ResourceType=security-group-rule,Tags=[{Key=Name,Value=HTTP}]" || true

    # HTTPS (443)
    aws ec2 authorize-security-group-ingress \
        --region "$REGION" \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --tag-specifications "ResourceType=security-group-rule,Tags=[{Key=Name,Value=HTTPS}]" || true

    # SSH (22) - ATENÇÃO: Restrinja ao seu IP em produção!
    log_warn "SSH (22) aberto para 0.0.0.0/0 - RESTRINJA ao seu IP em produção!"
    aws ec2 authorize-security-group-ingress \
        --region "$REGION" \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --tag-specifications "ResourceType=security-group-rule,Tags=[{Key=Name,Value=SSH}]" || true
fi

log_info "Security Group ID: $SG_ID"

# ============================================================================
# 5. Criar User Data script (inicialização)
# ============================================================================
cat > user-data.sh << 'EOF'
#!/bin/bash
set -x
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Atualizar sistema
apt-get update
apt-get upgrade -y

# Instalar dependências básicas
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    vim \
    fail2ban \
    ufw

# Configurar swap (importante para t2.micro com 1 GB RAM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verificar swap
swapon --show

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Adicionar usuário ubuntu ao grupo docker
usermod -aG docker ubuntu

# Instalar Docker Compose
DOCKER_COMPOSE_VERSION="2.24.5"
curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Configurar Docker daemon (otimizado para low memory)
cat > /etc/docker/daemon.json << 'DOCKEREOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
DOCKEREOF

systemctl restart docker
systemctl enable docker

# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Configurar Fail2Ban (proteção SSH)
systemctl enable fail2ban
systemctl start fail2ban

# Configurar UFW firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Criar diretório para aplicação
mkdir -p /opt/smartfinance
chown ubuntu:ubuntu /opt/smartfinance

# Marcar instalação completa
touch /var/log/user-data-complete

echo "User data script completed successfully"
EOF

log_info "User data script criado"

# ============================================================================
# 6. Lançar instância EC2
# ============================================================================
log_info "Lançando instância EC2 t2.micro..."
INSTANCE_ID=$(aws ec2 run-instances \
    --region "$REGION" \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":$VOLUME_SIZE,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$PROJECT_NAME},{Key=Project,Value=$PROJECT_NAME},{Key=Environment,Value=production},{Key=FreeTier,Value=true}]" \
    --monitoring Enabled=false \
    --instance-initiated-shutdown-behavior stop \
    --query 'Instances[0].InstanceId' \
    --output text)

if [ -z "$INSTANCE_ID" ]; then
    log_error "Falha ao criar instância EC2"
    exit 1
fi

log_info "Instância criada: $INSTANCE_ID"
log_info "Aguardando instância ficar running..."

aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

# ============================================================================
# 7. Alocar e associar Elastic IP
# ============================================================================
log_info "Alocando Elastic IP..."
ALLOCATION_ID=$(aws ec2 allocate-address \
    --region "$REGION" \
    --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$PROJECT_NAME},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'AllocationId' \
    --output text)

log_info "Elastic IP alocado: $ALLOCATION_ID"

log_info "Associando Elastic IP à instância..."
ASSOCIATION_ID=$(aws ec2 associate-address \
    --region "$REGION" \
    --instance-id "$INSTANCE_ID" \
    --allocation-id "$ALLOCATION_ID" \
    --query 'AssociationId' \
    --output text)

ELASTIC_IP=$(aws ec2 describe-addresses \
    --region "$REGION" \
    --allocation-ids "$ALLOCATION_ID" \
    --query 'Addresses[0].PublicIp' \
    --output text)

log_info "Elastic IP associado: $ELASTIC_IP"

# ============================================================================
# 8. Salvar informações em arquivo
# ============================================================================
cat > ec2-info.txt << EOF
SmartFinance - AWS Free Tier EC2 Instance
==========================================

Região: $REGION
Instância ID: $INSTANCE_ID
Instância Type: $INSTANCE_TYPE
AMI ID: $AMI_ID
Elastic IP: $ELASTIC_IP
Security Group: $SG_ID
Key Pair: ${KEY_NAME}.pem

Conectar via SSH:
-----------------
ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP}

Custos estimados:
-----------------
- Ano 1 (Free Tier): \$0/mês
- Ano 2+: ~\$8-10/mês

Próximos passos:
-----------------
1. Aguarde 5 minutos para user-data script completar
2. Execute: ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP}
3. Verifique instalação: cat /var/log/user-data.log
4. Execute: ./2-deploy-application.sh

Criado em: $(date)
EOF

log_info "Informações salvas em: ec2-info.txt"

# ============================================================================
# 9. Resumo final
# ============================================================================
echo ""
echo "============================================================================"
log_info "EC2 Instance criada com sucesso!"
echo "============================================================================"
echo ""
echo "Elastic IP: $ELASTIC_IP"
echo "Instance ID: $INSTANCE_ID"
echo ""
echo "Conectar via SSH (aguarde 5 minutos para setup completar):"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP}"
echo ""
echo "Verificar logs de instalação:"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'tail -f /var/log/user-data.log'"
echo ""
echo "Próximo passo:"
echo "  ./2-deploy-application.sh"
echo ""
echo "============================================================================"
echo ""

# Salvar variáveis de ambiente para próximos scripts
cat > .env.ec2 << EOF
ELASTIC_IP=$ELASTIC_IP
INSTANCE_ID=$INSTANCE_ID
KEY_NAME=$KEY_NAME
REGION=$REGION
EOF

log_info "Variáveis salvas em: .env.ec2"
