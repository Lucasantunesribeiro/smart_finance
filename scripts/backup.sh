#!/bin/bash
#
# SmartFinance Database Backup Script
# Executa backup diário do PostgreSQL
#

set -e

# Configurações
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smartfinance_db_$DATE.sql"
CONTAINER_NAME="smartfinance_postgres"
DB_NAME="smartfinance"
DB_USER="smartfinance"
RETENTION_DAYS=7

# Criar diretório de backups se não existir
mkdir -p "$BACKUP_DIR"

echo "====================================="
echo "SmartFinance Database Backup"
echo "Data: $(date)"
echo "====================================="

# Verificar se container está rodando
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "ERRO: Container $CONTAINER_NAME não está rodando!"
    exit 1
fi

# Fazer backup
echo "Iniciando backup..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

# Comprimir backup
echo "Comprimindo backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Calcular tamanho do backup
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup concluído: $BACKUP_FILE ($BACKUP_SIZE)"

# Remover backups antigos
echo "Removendo backups com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -name "smartfinance_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Listar backups existentes
echo ""
echo "Backups disponíveis:"
ls -lh "$BACKUP_DIR"/smartfinance_db_*.sql.gz 2>/dev/null || echo "Nenhum backup encontrado"

echo ""
echo "✓ Backup concluído com sucesso!"
echo "====================================="
