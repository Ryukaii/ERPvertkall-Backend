#!/bin/bash

# Script de Deploy das Otimizações de Performance
# Execute este script para aplicar todas as otimizações

set -e

echo "🚀 Iniciando deploy das otimizações de performance..."

# =====================================================
# 1. VERIFICAR CONFIGURAÇÕES
# =====================================================

echo "📋 Verificando configurações..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto"
    exit 1
fi

# Verificar se o Heroku CLI está instalado
if ! command -v heroku &> /dev/null; then
    echo "❌ Erro: Heroku CLI não está instalado"
    echo "Instale em: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# =====================================================
# 2. BACKUP ANTES DO DEPLOY
# =====================================================

echo "💾 Criando backup das configurações atuais..."

# Backup do package.json
cp package.json package.json.backup

# Backup das configurações do Prisma
cp src/config/prisma.service.ts src/config/prisma.service.ts.backup

echo "✅ Backup criado com sucesso"

# =====================================================
# 3. APLICAR OTIMIZAÇÕES NO CÓDIGO
# =====================================================

echo "🔧 Aplicando otimizações no código..."

# Verificar se as otimizações já foram aplicadas
if grep -q "findManyOptimized" src/config/prisma.service.ts; then
    echo "✅ Otimizações já aplicadas no código"
else
    echo "❌ Otimizações não encontradas no código"
    echo "Execute as otimizações manuais primeiro"
    exit 1
fi

# =====================================================
# 4. TESTES LOCAIS
# =====================================================

echo "🧪 Executando testes locais..."

# Verificar se o TypeScript compila
echo "📝 Verificando compilação TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Compilação TypeScript bem-sucedida"
else
    echo "❌ Erro na compilação TypeScript"
    exit 1
fi

# =====================================================
# 5. DEPLOY NO HEROKU
# =====================================================

echo "🚀 Fazendo deploy no Heroku..."

# Verificar se há mudanças para commitar
if git diff --quiet; then
    echo "📝 Nenhuma mudança para commitar"
else
    echo "📝 Commitando mudanças..."
    git add .
    git commit -m "feat: Apply performance optimizations for Supabase

- Optimize PrismaService connection pooling
- Add pagination to all list endpoints
- Implement selective field queries
- Add retry logic for database operations
- Reduce connection limit from 5 to 3
- Add session timeouts for better stability"
fi

# Push para o Heroku
echo "🚀 Fazendo push para o Heroku..."
git push heroku main

if [ $? -eq 0 ]; then
    echo "✅ Deploy no Heroku bem-sucedido"
else
    echo "❌ Erro no deploy do Heroku"
    exit 1
fi

# =====================================================
# 6. VERIFICAR DEPLOY
# =====================================================

echo "🔍 Verificando deploy..."

# Aguardar um pouco para o deploy finalizar
sleep 10

# Verificar logs
echo "📋 Verificando logs do Heroku..."
heroku logs --tail --num 50 | grep -E "(Slow query|Connection pool|Database connected|Error)" || true

# =====================================================
# 7. APLICAR ÍNDICES NO SUPABASE
# =====================================================

echo "🗄️ Aplicando índices no Supabase..."

echo "⚠️  IMPORTANTE: Execute os scripts SQL no Supabase Dashboard"
echo ""
echo "📋 Script 1 - Otimizações Gerais:"
echo "📁 Arquivo: optimize-database.sql"
echo "📍 Localização: SQL Editor > New Query"
echo ""
echo "📋 Script 2 - Correções do Database Linter:"
echo "📁 Arquivo: supabase-performance-fixes.sql"
echo "📍 Localização: SQL Editor > New Query"
echo ""
echo "📋 Passos:"
echo "1. Acesse o Supabase Dashboard"
echo "2. Vá para SQL Editor"
echo "3. Crie uma nova query"
echo "4. Cole o conteúdo do arquivo optimize-database.sql"
echo "5. Execute o script"
echo "6. Crie outra query"
echo "7. Cole o conteúdo do arquivo supabase-performance-fixes.sql"
echo "8. Execute o script"
echo ""

# =====================================================
# 8. VERIFICAÇÃO FINAL
# =====================================================

echo "✅ Deploy das otimizações concluído!"
echo ""
echo "📊 Próximos passos para monitoramento:"
echo ""
echo "1. Monitorar logs:"
echo "   heroku logs --tail | grep 'Slow query'"
echo ""
echo "2. Verificar performance no Supabase:"
echo "   Dashboard > Analytics > Query Performance"
echo ""
echo "3. Testar endpoints:"
echo "   - GET /financial-transactions"
echo "   - GET /bancos/{id}/transactions"
echo ""
echo "4. Verificar métricas esperadas:"
echo "   - Tempo de consulta: 20-100ms (antes: 100-500ms)"
echo "   - Conexões ativas: máximo 3"
echo "   - Queries lentas: < 500ms"
echo ""

# =====================================================
# 9. ROLLBACK (se necessário)
# =====================================================

echo "🔄 Para fazer rollback (se necessário):"
echo "1. Restaurar backup: cp package.json.backup package.json"
echo "2. Restaurar PrismaService: cp src/config/prisma.service.ts.backup src/config/prisma.service.ts"
echo "3. Fazer novo deploy: git push heroku main"
echo ""

echo "🎉 Otimizações aplicadas com sucesso!" 