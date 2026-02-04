#!/bin/bash
#
# SmartFinance Database Restore Script
# Restaura backup do PostgreSQL
#

set -e

# Verificar argumentos
if [ "$#" -ne 1 ]; then
    echo "Uso: $0 <arquivo_backup.sql.gz>"
    echo ""
    echo "Exemplos:"
    echo "  $0 /home/ubuntu/backups/smartfinance_db_20260203_030000.sql.gz"
    echo "  $0 smartfinance_backup.sql (arquivo SQL não comprimido)"
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="smartfinance_postgres"
DB_NAME="smartfinance"
DB_USER="smartfinance"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERRO: Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "====================================="
echo "SmartFinance Database Restore"
echo "Data: $(date)"
echo "Backup: $BACKUP_FILE"
echo "====================================="

# Confirmar ação
read -p "⚠️  ATENÇÃO: Isso vai SOBRESCREVER o banco de dados atual. Continuar? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operação cancelada."
    exit 0
fi

# Verificar se container está rodando
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "ERRO: Container $CONTAINER_NAME não está rodando!"
    exit 1
fi

# Criar backup do estado atual antes de restaurar
echo "Criando backup de segurança do banco atual..."
SAFETY_BACKUP="/tmp/smartfinance_pre_restore_$(date +%Y%m%d_%H%M%S).sql"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$SAFETY_BACKUP"
echo "Backup de segurança salvo em: $SAFETY_BACKUP"

# Parar aplicação para evitar conexões ativas
echo "Parando containers da aplicação..."
docker-compose -f /home/ubuntu/smartfinance/docker-compose.lightsail.yml stop frontend microservice

# Restaurar backup
echo "Restaurando banco de dados..."
if [[ $BACKUP_FILE == *.gz ]]; then
    # Arquivo comprimido
    gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
else
    # Arquivo SQL não comprimido
    cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
fi

# Reiniciar aplicação
echo "Reiniciando aplicação..."
docker-compose -f /home/ubuntu/smartfinance/docker-compose.lightsail.yml up -d

# Verificar status
echo ""
echo "Verificando status dos containers..."
docker-compose -f /home/ubuntu/smartfinance/docker-compose.lightsail.yml ps

echo ""
echo "✓ Restore concluído com sucesso!"
echo "====================================="
echo ""
echo "Para reverter (caso necessário), use:"
echo "  $0 $SAFETY_BACKUP"
