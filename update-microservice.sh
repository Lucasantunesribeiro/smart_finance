#!/bin/bash
# Script para atualizar o microserviço em produção
echo "🔄 Updating SmartFinance microservice..."

# Para o microserviço atual
echo "📱 Stopping current microservice..."
cd /opt/smartfinance/smart_finance/microservice
pkill -f "node.*server.js" || true
pkill -f "node.*index.js" || true

# Backup do arquivo atual
echo "💾 Creating backup..."
if [ -f "server.js" ]; then
    cp server.js server.js.backup.$(date +%Y%m%d_%H%M%S)
fi

# Remove arquivo antigo
rm -f server.js

# Cria o novo arquivo
echo "📝 Creating updated server.js..."
cat > server.js << 'EOL'