#!/bin/bash
set -euo pipefail

# ============================================================================
# SmartFinance - Deploy Application to EC2 Free Tier
# ============================================================================
# Este script faz deploy da aplicação SmartFinance na instância EC2
#
# Pré-requisitos:
# - Script 1-create-ec2.sh executado com sucesso
# - Arquivo .env.ec2 existe
# - Chave SSH /tmp/${KEY_NAME}.pem existe
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

# Carregar variáveis do script anterior
if [ ! -f .env.ec2 ]; then
    log_error "Arquivo .env.ec2 não encontrado. Execute ./1-create-ec2.sh primeiro"
    exit 1
fi

source .env.ec2

log_info "Elastic IP: $ELASTIC_IP"
log_info "Instance ID: $INSTANCE_ID"

# Verificar chave SSH
if [ ! -f "/tmp/${KEY_NAME}.pem" ]; then
    log_error "Chave SSH /tmp/${KEY_NAME}.pem não encontrada"
    exit 1
fi

# ============================================================================
# 1. Aguardar instância ficar pronta
# ============================================================================
log_info "Verificando se instância está pronta..."

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if ssh -i "/tmp/${KEY_NAME}.pem" \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=5 \
        ubuntu@${ELASTIC_IP} "test -f /var/log/user-data-complete" 2>/dev/null; then
        log_info "Instância pronta!"
        break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    log_warn "Aguardando instância... tentativa $ATTEMPT/$MAX_ATTEMPTS"
    sleep 10
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    log_error "Timeout aguardando instância ficar pronta"
    log_info "Verificar logs: ssh -i /tmp/${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'tail -100 /var/log/user-data.log'"
    exit 1
fi

# ============================================================================
# 2. Configurar Nginx
# ============================================================================
log_info "Configurando Nginx..."

# Gerar configuração Nginx
cat > nginx.conf << 'EOF'
# Otimizado para t2.micro (1 GB RAM)
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

    # Rate Limiting (proteção contra DoS)
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # Upstream para backend
    upstream backend {
        server localhost:5000 max_fails=3 fail_timeout=30s;
    }

    # Upstream para frontend
    upstream frontend {
        server localhost:3000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        server_name _;

        # Security headers
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
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # SignalR Hub
        location /financehub {
            proxy_pass http://backend/financehub;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Login endpoint (rate limiting mais restritivo)
        location /api/v1/auth/login {
            limit_req zone=login_limit burst=3 nodelay;

            proxy_pass http://backend/api/v1/auth/login;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend (Next.js)
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;

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

# Copiar configuração para EC2
log_info "Enviando configuração Nginx..."
scp -i "/tmp/${KEY_NAME}.pem" -o StrictHostKeyChecking=no \
    nginx.conf ubuntu@${ELASTIC_IP}:/tmp/nginx.conf

# Instalar e configurar Nginx
ssh -i "/tmp/${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << 'EOSSH'
set -e

# Instalar Nginx
sudo apt-get update
sudo apt-get install -y nginx

# Backup configuração original
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Aplicar nova configuração
sudo mv /tmp/nginx.conf /etc/nginx/nginx.conf

# Testar configuração
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "Nginx configurado com sucesso"
EOSSH

log_info "Nginx configurado"

# ============================================================================
# 3. Gerar secrets seguros
# ============================================================================
log_info "Gerando secrets seguros..."

generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

JWT_ACCESS_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)
JWT_SECRET_KEY=$(generate_secret)
DB_PASSWORD=$(generate_secret)

log_info "Secrets gerados"

# ============================================================================
# 4. Criar arquivo .env para produção
# ============================================================================
log_info "Criando arquivo .env..."

cat > .env.production << EOF
# SmartFinance Production Environment
# Generated: $(date)

# Database
DATABASE_URL=postgres://smartfinance:${DB_PASSWORD}@postgres:5432/smartfinance
DB_SSL=false
POSTGRES_DB=smartfinance
POSTGRES_USER=smartfinance
POSTGRES_PASSWORD=${DB_PASSWORD}

# JWT Secrets
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
JWT_ISSUER=SmartFinance
JWT_AUDIENCE=SmartFinanceUsers

# Application
NODE_ENV=production
PORT=5000
AUTO_MIGRATE=true
SEED_DEMO_DATA=false
TRUST_PROXY=true
COOKIE_SECURE=false
COOKIE_SAMESITE=Lax

# URLs (será atualizado com domínio real se configurar)
NEXT_PUBLIC_API_URL=http://${ELASTIC_IP}/api/v1
NEXT_PUBLIC_SIGNALR_URL=http://${ELASTIC_IP}/financehub
NEXT_PUBLIC_PAYMENT_API_URL=http://${ELASTIC_IP}/payment
ALLOWED_ORIGINS=http://${ELASTIC_IP},http://localhost:3000
EOF

log_info "Arquivo .env criado"

# ============================================================================
# 5. Criar docker-compose otimizado para EC2 Free Tier
# ============================================================================
log_info "Criando docker-compose.ec2.yml..."

cat > docker-compose.ec2.yml << 'EOF'
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: smartfinance_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - smartfinance_network
    mem_limit: 200m
    mem_reservation: 128m
    cpus: 0.3
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smartfinance"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  microservice:
    build:
      context: ./microservice
      dockerfile: Dockerfile
    image: smartfinance-backend:latest
    container_name: smartfinance_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - '127.0.0.1:5000:5000'
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: ${DATABASE_URL}
      DB_SSL: ${DB_SSL}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      JWT_ISSUER: ${JWT_ISSUER}
      JWT_AUDIENCE: ${JWT_AUDIENCE}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      AUTO_MIGRATE: ${AUTO_MIGRATE}
      SEED_DEMO_DATA: ${SEED_DEMO_DATA}
      TRUST_PROXY: ${TRUST_PROXY}
      COOKIE_SECURE: ${COOKIE_SECURE}
      COOKIE_SAMESITE: ${COOKIE_SAMESITE}
    networks:
      - smartfinance_network
    mem_limit: 300m
    mem_reservation: 200m
    cpus: 0.4
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    image: smartfinance-frontend:latest
    container_name: smartfinance_frontend
    restart: unless-stopped
    depends_on:
      - microservice
    ports:
      - '127.0.0.1:3000:3000'
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_SIGNALR_URL: ${NEXT_PUBLIC_SIGNALR_URL}
      NEXT_PUBLIC_PAYMENT_API_URL: ${NEXT_PUBLIC_PAYMENT_API_URL}
    networks:
      - smartfinance_network
    mem_limit: 200m
    mem_reservation: 128m
    cpus: 0.3
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  smartfinance_network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
EOF

log_info "docker-compose.ec2.yml criado"

# ============================================================================
# 6. Enviar código para EC2
# ============================================================================
log_info "Enviando código para EC2..."

# Navegar para raiz do projeto
cd "$(dirname "$0")/../.."

# Criar tarball do código (excluindo node_modules, .git, etc)
tar czf /tmp/smartfinance.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.next \
    --exclude=obj \
    --exclude=bin \
    --exclude='*.log' \
    --exclude=postgres_data \
    backend/ \
    frontend/ \
    microservice/

log_info "Código compactado: $(du -h /tmp/smartfinance.tar.gz | cut -f1)"

# Enviar para EC2
scp -i "infrastructure/aws-free-tier//tmp/${KEY_NAME}.pem" -o StrictHostKeyChecking=no \
    /tmp/smartfinance.tar.gz \
    ubuntu@${ELASTIC_IP}:/tmp/

# Enviar docker-compose e .env
scp -i "infrastructure/aws-free-tier//tmp/${KEY_NAME}.pem" -o StrictHostKeyChecking=no \
    infrastructure/aws-free-tier/docker-compose.ec2.yml \
    infrastructure/aws-free-tier/.env.production \
    ubuntu@${ELASTIC_IP}:/tmp/

log_info "Código enviado para EC2"

# ============================================================================
# 7. Extrair código e fazer deploy
# ============================================================================
log_info "Extraindo código e iniciando aplicação..."

ssh -i "infrastructure/aws-free-tier//tmp/${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << 'EOSSH'
set -e

cd /opt/smartfinance

# Extrair código
tar xzf /tmp/smartfinance.tar.gz

# Copiar configurações
cp /tmp/docker-compose.ec2.yml docker-compose.yml
cp /tmp/.env.production .env

# Ajustar permissões
chmod 600 .env

# Build e start containers
echo "Building images..."
docker compose build --no-cache

echo "Starting containers..."
docker compose up -d

# Aguardar containers ficarem healthy
echo "Aguardando containers ficarem healthy..."
sleep 30

# Verificar status
docker compose ps
docker compose logs --tail=50

echo "Deploy concluído!"
EOSSH

log_info "Aplicação deployada"

# ============================================================================
# 8. Verificar saúde da aplicação
# ============================================================================
log_info "Verificando saúde da aplicação..."

sleep 10

# Health check Nginx
if curl -f -s http://${ELASTIC_IP}/health > /dev/null; then
    log_info "✓ Nginx: OK"
else
    log_warn "✗ Nginx: FALHOU"
fi

# Health check Backend
if curl -f -s http://${ELASTIC_IP}/api/v1/health > /dev/null 2>&1; then
    log_info "✓ Backend: OK"
else
    log_warn "✗ Backend: Verificar logs"
fi

# Health check Frontend
if curl -f -s http://${ELASTIC_IP}/ > /dev/null 2>&1; then
    log_info "✓ Frontend: OK"
else
    log_warn "✗ Frontend: Verificar logs"
fi

# ============================================================================
# 9. Configurar systemd para auto-start
# ============================================================================
log_info "Configurando auto-start..."

ssh -i "infrastructure/aws-free-tier//tmp/${KEY_NAME}.pem" -o StrictHostKeyChecking=no ubuntu@${ELASTIC_IP} << 'EOSSH'
set -e

# Criar serviço systemd para docker-compose
sudo tee /etc/systemd/system/smartfinance.service > /dev/null << 'EOF'
[Unit]
Description=SmartFinance Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/smartfinance
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

# Habilitar serviço
sudo systemctl daemon-reload
sudo systemctl enable smartfinance.service

echo "Auto-start configurado"
EOSSH

log_info "Auto-start configurado"

# ============================================================================
# 10. Resumo final
# ============================================================================
echo ""
echo "============================================================================"
log_info "Deploy concluído com sucesso!"
echo "============================================================================"
echo ""
echo "URL da aplicação: http://${ELASTIC_IP}"
echo ""
echo "Testar endpoints:"
echo "  Frontend:  curl http://${ELASTIC_IP}/"
echo "  Backend:   curl http://${ELASTIC_IP}/api/v1/health"
echo "  Nginx:     curl http://${ELASTIC_IP}/health"
echo ""
echo "Verificar logs:"
echo "  ssh -i /tmp/${KEY_NAME}.pem ubuntu@${ELASTIC_IP} 'docker compose -f /opt/smartfinance/docker-compose.yml logs -f'"
echo ""
echo "Gerenciar aplicação:"
echo "  ssh -i /tmp/${KEY_NAME}.pem ubuntu@${ELASTIC_IP}"
echo "  cd /opt/smartfinance"
echo "  docker compose ps"
echo "  docker compose logs -f"
echo "  docker compose restart"
echo ""
echo "Próximo passo:"
echo "  ./3-setup-ssl.sh (configurar HTTPS com Let's Encrypt)"
echo ""
echo "============================================================================"
echo ""

# Salvar informações de deploy
cat > deploy-info.txt << EOF
SmartFinance - Deploy Information
==================================

URL: http://${ELASTIC_IP}
Deploy Date: $(date)

Credentials:
------------
(Use as credenciais de demonstração do seed data, se SEED_DEMO_DATA=true)

SSH Access:
-----------
ssh -i /tmp/${KEY_NAME}.pem ubuntu@${ELASTIC_IP}

Application Directory:
----------------------
/opt/smartfinance

Manage Application:
-------------------
cd /opt/smartfinance
docker compose ps
docker compose logs -f
docker compose restart [service]

Endpoints:
----------
Frontend:  http://${ELASTIC_IP}/
Backend:   http://${ELASTIC_IP}/api/v1/health
Nginx:     http://${ELASTIC_IP}/health

Next Steps:
-----------
1. Configurar domínio DNS (apontar A record para ${ELASTIC_IP})
2. Configurar SSL: ./3-setup-ssl.sh your-domain.com
3. Configurar backups: ./4-setup-backups.sh
EOF

log_info "Informações salvas em: deploy-info.txt"
