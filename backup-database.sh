#!/bin/bash

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

echo "💾 Criando backup do banco de dados..."

mkdir -p "$BACKUP_DIR"

if [ -n "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    echo "✅ Backup criado: $BACKUP_FILE"
    echo "📊 Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ DATABASE_URL não configurada"
fi
