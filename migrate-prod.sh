#!/bin/bash

# Script para migrações em produção no Heroku
echo "🚀 Script de Migração em Produção - Heroku"

# Verificar se estamos conectados ao Heroku
if ! heroku apps:info >/dev/null 2>&1; then
    echo "❌ Erro: Não foi possível conectar ao Heroku"
    echo "Certifique-se de estar logado: heroku login"
    exit 1
fi

echo "📋 Opções disponíveis:"
echo "1. Deploy e migrate automático"
echo "2. Apenas migrate (sem deploy)"
echo "3. Reset completo do banco (CUIDADO!)"
echo "4. Verificar status das migrações"
echo "5. Gerar novo migration"
echo ""

read -p "Escolha uma opção (1-5): " choice

case $choice in
    1)
        echo "🔄 Deploy + Migrate automático..."
        git push heroku main
        echo "⏳ Aguardando deploy..."
        sleep 10
        heroku run npm run db:migrate
        ;;
    2)
        echo "🔄 Executando apenas migrate..."
        heroku run npm run db:migrate
        ;;
    3)
        echo "⚠️  ATENÇÃO: Reset completo do banco!"
        read -p "Tem certeza? Isso apagará TODOS os dados! (y/N): " confirm
        if [[ $confirm == [yY] ]]; then
            heroku run npm run db:reset
        else
            echo "❌ Operação cancelada"
        fi
        ;;
    4)
        echo "📊 Verificando status das migrações..."
        heroku run npx prisma migrate status
        ;;
    5)
        echo "📝 Gerando nova migração..."
        read -p "Digite o nome da migração: " migration_name
        npx prisma migrate dev --name "$migration_name"
        echo "✅ Migração criada localmente"
        echo "💡 Agora execute a opção 1 para fazer deploy"
        ;;
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac

echo "✅ Operação concluída!" 