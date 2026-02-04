#!/bin/bash
set -euo pipefail

# ============================================================================
# SmartFinance - Setup SSL/HTTPS with Let's Encrypt
# ============================================================================
# Este script configura SSL gratuito usando Let's Encrypt (Certbot)
#
# Pré-requisitos:
# - Script 2-deploy-application.sh executado
# - Domínio configurado apontando para o Elastic IP
# - Porta 80 e 443 abertas no Security Group
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

# Verificar argumento (domínio)
if [ $# -lt 1 ]; then
    log_error "Uso: $0 <seu-dominio.com> [email@example.com]"
    log_info "Exemplo: $0 smartfinance.example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-""}

# Carregar variáveis
if [ ! -f .env.ec2 ]; then
    log_error "Arquivo .env.ec2 não encontrado. Execute ./1-create-ec2.sh primeiro"
    exit 1
fi

source .env.ec2

log_info "Domínio: $DOMAIN"
log_info "Elastic IP: $ELASTIC_IP"

# Validar que domínio aponta para Elastic IP
log_info "Verificando DNS..."
RESOLVED_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$RESOLVED_IP" != "$ELASTIC_IP" ]; then
    log_error "Domínio $DOMAIN não aponta para $ELASTIC_IP (aponta para: $RESOLVED_IP)"
    log_info "Configure o DNS A record antes de continuar:"
    log_info "  Nome: $DOMAIN"
    log_info "  Tipo: A"
    log_info "  Valor: $ELASTIC_IP"
    exit 1
fi

log_info "✓ DNS configurado corretamente"

# Solicitar email se não fornecido
if [ -z "$EMAIL" ]; then
    log_warn "Email não fornecido. Let's Encrypt enviará avisos de expiração para este email."
    read -p "Digite seu email: " EMAIL
fi

log_info "Email: $EMAIL"

# ============================================================================
# 1. Atualizar configuração Nginx para SSL
# ============================================================================
log_info "Criando configuração Nginx com SSL..."

cat > nginx-ssl.conf << EOF
user www-data;
worker_processes 1;
pid /run/nginx.pid;

events {
    worker_connections 512;
    use epoll;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Rate Limiting
    limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login_limit:10m rate=5r/m;

    # Upstream para backend
    upstream backend {
        server localhost:5000 max_fails=3 fail_timeout=30s;
    }

    # Upstream para frontend
    upstream frontend {
        server localhost:3000 max_fails=3 fail_timeout=30s;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name ${DOMAIN};

        # Allow Let's Encrypt validation
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirect everything else to HTTPS
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN};

        # SSL configuration
        ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API backend (com rate limiting)
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;

            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # SignalR Hub
        location /financehub {
            proxy_pass http://backend/financehub;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
        }

        # Login endpoint (rate limiting mais restritivo)
        location /api/v1/auth/login {
            limit_req zone=login_limit burst=3 nodelay;

            proxy_pass http://backend/api/v1/auth/login;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # Frontend (Next.js)
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;

            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Cache static assets do Next.js
        location /_next/static {
            proxy_pass http://frontend/_next/static;
            proxy_cache_valid 200 60m;
            add_header Cache-Control "public, max-age=3600, immutable";
        }
    }
}
EOF

# ============================================================================
# 2. Instalar Certbot e obter certificado
# ============================================================================
log_info "Instalando Certbot na instância EC2..."

ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << EOSSH
set -e

# Instalar Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Criar diretório para validação
sudo mkdir -p /var/www/certbot

# Obter certificado SSL
sudo certbot certonly --standalone \
    --preferred-challenges http \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    -d ${DOMAIN}

echo "Certificado SSL obtido com sucesso"

# Configurar renovação automática (já vem configurado pelo Certbot)
sudo systemctl status certbot.timer || true

echo "Auto-renewal configurado via systemd timer"
EOSSH

log_info "Certbot instalado e certificado obtido"

# ============================================================================
# 3. Aplicar configuração Nginx com SSL
# ============================================================================
log_info "Aplicando configuração Nginx com SSL..."

# Enviar nova configuração
scp -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no \
    nginx-ssl.conf ubuntu@${ELASTIC_IP}:/tmp/nginx-ssl.conf

ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << 'EOSSH'
set -e

# Backup configuração atual
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.pre-ssl

# Aplicar nova configuração
sudo mv /tmp/nginx-ssl.conf /etc/nginx/nginx.conf

# Testar configuração
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

echo "Nginx configurado com SSL"
EOSSH

log_info "Nginx configurado com SSL"

# ============================================================================
# 4. Atualizar variáveis de ambiente com HTTPS
# ============================================================================
log_info "Atualizando variáveis de ambiente..."

ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << EOSSH
set -e

cd /opt/smartfinance

# Backup .env atual
cp .env .env.pre-ssl

# Atualizar URLs para HTTPS
sed -i "s|http://${ELASTIC_IP}|https://${DOMAIN}|g" .env
sed -i 's|COOKIE_SECURE=false|COOKIE_SECURE=true|g' .env

# Restart containers para aplicar novas variáveis
docker compose restart

echo "Variáveis de ambiente atualizadas"
EOSSH

log_info "Variáveis de ambiente atualizadas"

# ============================================================================
# 5. Verificar SSL
# ============================================================================
log_info "Verificando configuração SSL..."

sleep 5

# Testar HTTPS
if curl -f -s https://${DOMAIN}/health > /dev/null; then
    log_info "✓ HTTPS funcionando"
else
    log_warn "✗ HTTPS não respondendo"
fi

# Testar redirect HTTP -> HTTPS
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://${DOMAIN}/)
if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
    log_info "✓ HTTP -> HTTPS redirect funcionando"
else
    log_warn "✗ Redirect não configurado corretamente (HTTP $HTTP_RESPONSE)"
fi

# ============================================================================
# 6. Resumo final
# ============================================================================
echo ""
echo "============================================================================"
log_info "SSL/HTTPS configurado com sucesso!"
echo "============================================================================"
echo ""
echo "URL segura: https://${DOMAIN}"
echo ""
echo "Certificado:"
echo "  Emissor: Let's Encrypt"
echo "  Válido por: 90 dias"
echo "  Auto-renewal: Configurado (via Certbot)"
echo ""
echo "Testar SSL:"
echo "  curl -I https://${DOMAIN}"
echo "  curl https://${DOMAIN}/api/v1/health"
echo ""
echo "Verificar certificado:"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'sudo certbot certificates'"
echo ""
echo "Renovar manualmente (se necessário):"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'sudo certbot renew'"
echo ""
echo "Próximo passo:"
echo "  ./4-setup-backups.sh (configurar backups automáticos)"
echo ""
echo "============================================================================"
echo ""

# Salvar informações SSL
cat > ssl-info.txt << EOF
SmartFinance - SSL Configuration
=================================

Domain: ${DOMAIN}
Secure URL: https://${DOMAIN}
Setup Date: $(date)

Certificate:
------------
Provider: Let's Encrypt
Valid for: 90 days
Auto-renewal: Enabled (certbot.timer)

Check certificate:
------------------
ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'sudo certbot certificates'

Renew manually:
---------------
ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'sudo certbot renew'

Check auto-renewal timer:
-------------------------
ssh -i ${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'sudo systemctl status certbot.timer'
EOF

log_info "Informações salvas em: ssl-info.txt"
