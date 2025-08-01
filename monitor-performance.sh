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
if [ -n "$DIRECT_URL" ]; then
    psql "$DIRECT_URL" -c "
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
    echo "❌ DIRECT_URL não configurada"
fi

# Verificar views materializadas
echo ""
echo "🔍 Verificando views materializadas..."
if [ -n "$DIRECT_URL" ]; then
    psql "$DIRECT_URL" -c "
    SELECT 
        schemaname,
        matviewname,
        pg_size_pretty(pg_relation_size(schemaname||'.'||matviewname)) as view_size
    FROM pg_matviews 
    WHERE schemaname = 'public'
    ORDER BY pg_relation_size(schemaname||'.'||matviewname) DESC;
    "
else
    echo "❌ DIRECT_URL não configurada"
fi

echo ""
echo "✅ Monitoramento concluído"
