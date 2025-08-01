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
