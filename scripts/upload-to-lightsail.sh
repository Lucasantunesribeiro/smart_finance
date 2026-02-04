#!/bin/bash
#
# SmartFinance - Upload de Arquivos para Lightsail
# Uso: bash upload-to-lightsail.sh <LIGHTSAIL_IP>
#

set -e

LIGHTSAIL_IP="$1"
SSH_KEY="$HOME/lightsail-smartfinance-key.pem"
PROJECT_DIR="/mnt/d/programacao/smartfinance"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

if [ -z "$LIGHTSAIL_IP" ]; then
    print_error "Uso: bash upload-to-lightsail.sh <LIGHTSAIL_IP>"
    exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH Key não encontrada: $SSH_KEY"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/.env.production.local" ]; then
    print_error ".env.production.local não encontrado!"
    echo "Crie o arquivo primeiro:"
    echo "  cd $PROJECT_DIR"
    echo "  cp .env.production.example .env.production.local"
    echo "  nano .env.production.local"
    exit 1
fi

echo "========================================="
echo "SmartFinance - Upload para Lightsail"
echo "========================================="
echo "IP: $LIGHTSAIL_IP"
echo "SSH Key: $SSH_KEY"
echo ""

# Testar conectividade SSH
print_info "Testando conectividade SSH..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP "echo 'SSH OK'" > /dev/null 2>&1; then
    print_info "SSH conectado com sucesso!"
else
    print_error "Falha ao conectar via SSH!"
    echo "Verifique:"
    echo "  1. IP está correto: $LIGHTSAIL_IP"
    echo "  2. Firewall permite seu IP na porta 22"
    echo "  3. Chave SSH tem permissão 400: chmod 400 $SSH_KEY"
    exit 1
fi

# Criar tarball
print_info "Criando tarball da aplicação..."
cd "$PROJECT_DIR"

tar -czf /tmp/smartfinance-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='frontend/node_modules' \
    --exclude='microservice/node_modules' \
    --exclude='frontend/.next' \
    --exclude='backend' \
    --exclude='infrastructure' \
    --exclude='*.tar.gz' \
    docker-compose.lightsail.yml \
    frontend/ \
    microservice/ \
    nginx/ \
    scripts/

TARBALL_SIZE=$(du -h /tmp/smartfinance-deploy.tar.gz | cut -f1)
print_info "Tarball criado: $TARBALL_SIZE"

# Upload tarball
print_info "Uploading tarball para Lightsail..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    /tmp/smartfinance-deploy.tar.gz \
    ubuntu@$LIGHTSAIL_IP:/home/ubuntu/

# Upload .env.production
print_info "Uploading .env.production..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    .env.production.local \
    ubuntu@$LIGHTSAIL_IP:/home/ubuntu/.env.production

# Upload setup script
print_info "Uploading setup script..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    scripts/setup-lightsail-instance.sh \
    ubuntu@$LIGHTSAIL_IP:/home/ubuntu/

# Limpar tarball local
rm /tmp/smartfinance-deploy.tar.gz

print_info "Upload completo!"

echo ""
echo "========================================="
echo "Próximos Passos:"
echo "========================================="
echo ""
echo "1. SSH na instância:"
echo "   ssh -i $SSH_KEY ubuntu@$LIGHTSAIL_IP"
echo ""
echo "2. Executar setup (dentro da instância):"
echo "   bash ~/setup-lightsail-instance.sh"
echo ""
echo "3. Fazer LOGOUT e LOGIN novamente para aplicar permissões Docker"
echo ""
echo "4. Extrair e organizar arquivos:"
echo "   cd /home/ubuntu"
echo "   tar -xzf smartfinance-deploy.tar.gz"
echo "   mkdir -p ~/smartfinance"
echo "   mv docker-compose.lightsail.yml frontend microservice nginx scripts ~/smartfinance/"
echo "   mv .env.production ~/smartfinance/"
echo ""
echo "5. Deploy da aplicação:"
echo "   cd ~/smartfinance"
echo "   bash scripts/deploy-lightsail.sh"
echo ""
echo "6. Configurar Nginx:"
echo "   sudo cp ~/smartfinance/nginx/nginx.lightsail.conf /etc/nginx/sites-available/smartfinance"
echo "   sudo rm /etc/nginx/sites-enabled/default"
echo "   sudo ln -s /etc/nginx/sites-available/smartfinance /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "7. Testar no navegador:"
echo "   http://$LIGHTSAIL_IP"
echo ""
