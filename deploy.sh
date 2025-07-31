#!/bin/bash

# Deploy script para Heroku com configurações do Supabase
echo "🚀 Iniciando deploy para Heroku..."

# 1. Gerar o cliente Prisma
echo "📦 Gerando cliente Prisma..."
npm run db:generate

# 2. Build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build

# 3. Commit das mudanças se houver
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Commitando mudanças..."
    git add .
    git commit -m "deploy: Update Prisma client and build"
fi

# 4. Deploy para o Heroku
echo "🚀 Fazendo deploy para Heroku..."
git push heroku main

# 5. Verificar logs
echo "📊 Verificando logs..."
heroku logs --tail --num=50

echo "✅ Deploy concluído!"