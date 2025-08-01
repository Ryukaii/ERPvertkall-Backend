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
