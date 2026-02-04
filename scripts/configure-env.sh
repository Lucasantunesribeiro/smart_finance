#!/bin/bash
#
# Script para configurar .env.production.local com IP Lightsail
#

set -e

if [ "$#" -ne 1 ]; then
    echo "❌ Uso: $0 <LIGHTSAIL_IP>"
    echo ""
    echo "Exemplo:"
    echo "  $0 18.230.45.67"
    exit 1
fi

LIGHTSAIL_IP="$1"
ENV_FILE=".env.production.local"
SECRETS_FILE="$HOME/smartfinance-migration/secrets.txt"

# Verificar se arquivo de secrets existe
if [ ! -f "$SECRETS_FILE" ]; then
    echo "❌ Arquivo de secrets não encontrado: $SECRETS_FILE"
    exit 1
fi

# Ler secrets
DB_PASSWORD=$(grep "DB_PASSWORD=" "$SECRETS_FILE" | tail -1 | cut -d'=' -f2)
JWT_ACCESS_SECRET=$(grep "JWT_ACCESS_SECRET=" "$SECRETS_FILE" | tail -1 | cut -d'=' -f2)
JWT_REFRESH_SECRET=$(grep "JWT_REFRESH_SECRET=" "$SECRETS_FILE" | tail -1 | cut -d'=' -f2)
JWT_SECRET_KEY=$(grep "JWT_SECRET_KEY=" "$SECRETS_FILE" | tail -1 | cut -d'=' -f2)

echo "════════════════════════════════════════"
echo "  Configurando .env.production.local"
echo "════════════════════════════════════════"
echo ""
echo "📍 Lightsail IP: $LIGHTSAIL_IP"
echo "🔐 Secrets carregados de: $SECRETS_FILE"
echo ""

# Criar .env.production.local do template
cp .env.production.example .env.production.local

# Substituir valores
sed -i "s/CHANGE_ME_STRONG_PASSWORD_HERE/$DB_PASSWORD/g" .env.production.local
sed -i "0,/CHANGE_ME_32_CHARS_MINIMUM_RANDOM_STRING/s//$JWT_ACCESS_SECRET/" .env.production.local
sed -i "0,/CHANGE_ME_32_CHARS_MINIMUM_RANDOM_STRING/s//$JWT_REFRESH_SECRET/" .env.production.local
sed -i "0,/CHANGE_ME_32_CHARS_MINIMUM_RANDOM_STRING/s//$JWT_SECRET_KEY/" .env.production.local

# Substituir IPs
sed -i "s/YOUR_LIGHTSAIL_IP/$LIGHTSAIL_IP/g" .env.production.local
sed -i "s/<LIGHTSAIL_IP>/$LIGHTSAIL_IP/g" .env.production.local

echo "✅ Arquivo .env.production.local configurado!"
echo ""
echo "Valores configurados:"
echo "  - DB_PASSWORD: ${DB_PASSWORD:0:20}..."
echo "  - JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:0:20}..."
echo "  - JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:0:20}..."
echo "  - JWT_SECRET_KEY: ${JWT_SECRET_KEY:0:20}..."
echo "  - ALLOWED_ORIGINS: http://$LIGHTSAIL_IP"
echo "  - NEXT_PUBLIC_API_URL: http://$LIGHTSAIL_IP/api/v1"
echo ""
echo "════════════════════════════════════════"
echo "  PRÓXIMO PASSO:"
echo "  bash scripts/complete-migration.sh $LIGHTSAIL_IP"
echo "════════════════════════════════════════"
