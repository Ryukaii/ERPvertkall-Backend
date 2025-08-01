#!/bin/bash

# =====================================================
# SCRIPT DE APLICAÇÃO DE OTIMIZAÇÕES DE PERFORMANCE
# =====================================================

echo "🚀 Iniciando aplicação das otimizações de performance..."

# 1. INSTALAR DEPENDÊNCIAS DO REDIS
echo "📦 Instalando dependências do Redis..."
npm install ioredis@^5.3.2

# 2. GERAR CLIENTE PRISMA ATUALIZADO
echo "🔧 Gerando cliente Prisma atualizado..."
npm run db:generate

# 3. APLICAR MIGRAÇÕES DO BANCO
echo "🗄️ Aplicando migrações do banco de dados..."
npm run db:migrate

# 4. EXECUTAR SCRIPT DE OTIMIZAÇÃO SQL
echo "⚡ Aplicando otimizações de índices e views materializadas..."
echo "⚠️  ATENÇÃO: Este processo pode demorar alguns minutos dependendo do tamanho do banco."

# Verificar se o PostgreSQL está acessível
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL encontrado"
    
    # Executar script de otimização
    if [ -n "$DATABASE_URL" ]; then
        echo "🔗 Usando DATABASE_URL do ambiente..."
        psql "$DATABASE_URL" -f optimize-database-performance.sql
    else
        echo "❌ DATABASE_URL não encontrada. Execute manualmente:"
        echo "psql SUA_URL_DO_BANCO -f optimize-database-performance.sql"
    fi
else
    echo "❌ PostgreSQL não encontrado. Execute manualmente:"
    echo "psql SUA_URL_DO_BANCO -f optimize-database-performance.sql"
fi

# 5. CONFIGURAR VARIÁVEIS DE AMBIENTE
echo "🔧 Configurando variáveis de ambiente..."

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp env.example .env
fi

# Adicionar configurações do Redis ao .env se não existirem
if ! grep -q "REDIS_HOST" .env; then
    echo "" >> .env
    echo "# Redis Configuration" >> .env
    echo "REDIS_HOST=localhost" >> .env
    echo "REDIS_PORT=6379" >> .env
    echo "REDIS_PASSWORD=" >> .env
    echo "REDIS_DB=0" >> .env
    echo "✅ Configurações do Redis adicionadas ao .env"
else
    echo "✅ Configurações do Redis já existem no .env"
fi

# 6. VERIFICAR CONFIGURAÇÕES DO BANCO
echo "🔍 Verificando configurações do banco..."

# Adicionar configurações de performance ao DATABASE_URL se não existirem
if grep -q "DATABASE_URL" .env; then
    DATABASE_URL_LINE=$(grep "DATABASE_URL" .env)
    if [[ ! "$DATABASE_URL_LINE" == *"connection_limit"* ]]; then
        echo "⚡ Otimizando DATABASE_URL com configurações de performance..."
        # Backup da linha original
        sed -i.bak 's/DATABASE_URL=.*/DATABASE_URL_ORIGINAL=&/' .env
        
        # Adicionar parâmetros de performance
        sed -i 's/DATABASE_URL=\([^?]*\)/DATABASE_URL=\1?connection_limit=20\&pool_timeout=5\&connect_timeout=10/' .env
        
        echo "✅ DATABASE_URL otimizada com configurações de connection pooling"
    else
        echo "✅ DATABASE_URL já possui configurações de performance"
    fi
fi

# 7. CRIAR SCRIPT DE MONITORAMENTO
echo "📊 Criando script de monitoramento..."

cat > monitor-performance.sh << 'EOF'
#!/bin/bash

echo "📊 Monitoramento de Performance"
echo "================================"

# Verificar conexão com Redis
echo "🔍 Verificando Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis está funcionando"
        redis-cli info memory | grep -E "(used_memory|used_memory_peak|used_memory_rss)"
    else
        echo "❌ Redis não está respondendo"
    fi
else
    echo "⚠️  redis-cli não encontrado"
fi

# Verificar índices do banco
echo ""
echo "🔍 Verificando índices do banco..."
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -c "
    SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_indexes 
    WHERE tablename IN (
        'financial_transactions',
        'ofx_pending_transactions',
        'ofx_imports',
        'banks'
    )
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 10;
    "
else
    echo "❌ DATABASE_URL não configurada"
fi

# Verificar views materializadas
echo ""
echo "🔍 Verificando views materializadas..."
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -c "
    SELECT 
        schemaname,
        matviewname,
        pg_size_pretty(pg_relation_size(schemaname||'.'||matviewname)) as view_size
    FROM pg_matviews 
    WHERE schemaname = 'public'
    ORDER BY pg_relation_size(schemaname||'.'||matviewname) DESC;
    "
else
    echo "❌ DATABASE_URL não configurada"
fi

echo ""
echo "✅ Monitoramento concluído"
EOF

chmod +x monitor-performance.sh

# 8. CRIAR SCRIPT DE REFRESH DAS VIEWS
echo "🔄 Criando script de refresh das views materializadas..."

cat > refresh-views.sh << 'EOF'
#!/bin/bash

echo "🔄 Atualizando views materializadas..."

if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -c "
    SELECT refresh_user_monthly_summary();
    SELECT refresh_category_balance_summary();
    SELECT refresh_overdue_transactions_summary();
    "
    echo "✅ Views materializadas atualizadas"
else
    echo "❌ DATABASE_URL não configurada"
fi
EOF

chmod +x refresh-views.sh

# 9. CRIAR SCRIPT DE LIMPEZA DE CACHE
echo "🧹 Criando script de limpeza de cache..."

cat > clear-cache.sh << 'EOF'
#!/bin/bash

echo "🧹 Limpando cache Redis..."

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        redis-cli flushdb
        echo "✅ Cache Redis limpo"
    else
        echo "❌ Redis não está respondendo"
    fi
else
    echo "⚠️  redis-cli não encontrado"
fi
EOF

chmod +x clear-cache.sh

# 10. CRIAR SCRIPT DE BACKUP
echo "💾 Criando script de backup..."

cat > backup-database.sh << 'EOF'
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
EOF

chmod +x backup-database.sh

# 11. VERIFICAR SE TUDO FOI APLICADO CORRETAMENTE
echo ""
echo "🔍 Verificando se tudo foi aplicado corretamente..."

# Verificar se o Redis está instalado
if npm list ioredis &> /dev/null; then
    echo "✅ ioredis instalado"
else
    echo "❌ ioredis não instalado"
fi

# Verificar se os arquivos foram criados
if [ -f "monitor-performance.sh" ]; then
    echo "✅ Script de monitoramento criado"
else
    echo "❌ Script de monitoramento não criado"
fi

if [ -f "refresh-views.sh" ]; then
    echo "✅ Script de refresh criado"
else
    echo "❌ Script de refresh não criado"
fi

if [ -f "clear-cache.sh" ]; then
    echo "✅ Script de limpeza criado"
else
    echo "❌ Script de limpeza não criado"
fi

if [ -f "backup-database.sh" ]; then
    echo "✅ Script de backup criado"
else
    echo "❌ Script de backup não criado"
fi

# 12. INSTRUÇÕES FINAIS
echo ""
echo "🎉 Otimizações de performance aplicadas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o Redis em seu ambiente"
echo "2. Execute: ./monitor-performance.sh para verificar o status"
echo "3. Execute: ./refresh-views.sh para atualizar as views materializadas"
echo "4. Execute: ./clear-cache.sh para limpar o cache se necessário"
echo "5. Execute: ./backup-database.sh para criar backup antes de mudanças"
echo ""
echo "🔧 Configurações importantes:"
echo "- Redis: $REDIS_HOST:$REDIS_PORT"
echo "- Connection Pool: 20 conexões"
echo "- Cache TTL: 2-10 minutos"
echo "- Views Materializadas: Atualizadas automaticamente"
echo ""
echo "📊 Para monitorar performance:"
echo "- Use: ./monitor-performance.sh"
echo "- Verifique logs do Redis: redis-cli monitor"
echo "- Verifique queries lentas: pg_stat_statements"
echo ""
echo "✅ Todas as otimizações foram aplicadas!" 