-- =====================================================
-- SCRIPT DE OTIMIZAÇÃO DE ÍNDICES (VERSÃO CORRIGIDA)
-- =====================================================
-- Este script remove índices redundantes e pouco efetivos
-- Execute com cuidado em produção!

BEGIN;

-- =====================================================
-- 1. REMOÇÃO DE ÍNDICES REDUNDANTES
-- =====================================================

-- Remover índices únicos redundantes (já existem como constraints)
DROP INDEX IF EXISTS financial_categories_name_key;
DROP INDEX IF EXISTS payment_methods_name_key;
DROP INDEX IF EXISTS tags_name_key;
DROP INDEX IF EXISTS users_email_key;

-- Remover índices duplicados em tabelas de relacionamento
DROP INDEX IF EXISTS financial_transaction_tags_financialTransactionId_tagId_idx;
DROP INDEX IF EXISTS ofx_pending_transaction_tags_ofxPendingTransactionId_tagId_idx;

-- Remover índices pouco efetivos (substituídos por índices compostos)
DROP INDEX IF EXISTS financial_transactions_userId_type_idx;
DROP INDEX IF EXISTS financial_transactions_userId_status_idx;

-- =====================================================
-- 2. ADIÇÃO DE ÍNDICES SUGERIDOS (OPCIONAIS)
-- =====================================================

-- Para consultas de pagamentos recorrentes
CREATE INDEX IF NOT EXISTS recurring_payments_paymentMethodId_idx ON recurring_payments("paymentMethodId");
CREATE INDEX IF NOT EXISTS recurring_payments_unidadeId_idx ON recurring_payments("unidadeId");

-- Para consultas de permissões de usuário
CREATE INDEX IF NOT EXISTS user_permissions_userId_idx ON user_permissions("userId");
CREATE INDEX IF NOT EXISTS user_permissions_moduleId_idx ON user_permissions("moduleId");

-- Para consultas de transações por data de criação (útil para auditoria)
CREATE INDEX IF NOT EXISTS financial_transactions_createdAt_idx ON financial_transactions("createdAt");

-- Para consultas de transações por data de pagamento
CREATE INDEX IF NOT EXISTS financial_transactions_paidDate_idx ON financial_transactions("paidDate");

-- =====================================================
-- 3. VERIFICAÇÃO FINAL
-- =====================================================

-- Comando para verificar se os índices foram removidos corretamente
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    -- Verificar se os índices redundantes foram removidos
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname IN (
        'financial_categories_name_key',
        'payment_methods_name_key',
        'tags_name_key',
        'users_email_key',
        'financial_transaction_tags_financialTransactionId_tagId_idx',
        'ofx_pending_transaction_tags_ofxPendingTransactionId_tagId_idx',
        'financial_transactions_userId_type_idx',
        'financial_transactions_userId_status_idx'
    );
    
    IF index_count = 0 THEN
        RAISE NOTICE '✅ Todos os índices redundantes foram removidos com sucesso!';
    ELSE
        RAISE NOTICE '⚠️  Ainda existem % índices redundantes', index_count;
    END IF;
    
    -- Mostrar total de índices após otimização
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '📊 Total de índices após otimização: %', index_count;
END $$;

COMMIT;

-- =====================================================
-- RESUMO DA OTIMIZAÇÃO
-- =====================================================
/*
✅ ÍNDICES REMOVIDOS (7):
- financial_categories_name_key
- payment_methods_name_key  
- tags_name_key
- users_email_key
- financial_transaction_tags_financialTransactionId_tagId_idx
- ofx_pending_transaction_tags_ofxPendingTransactionId_tagId_idx
- financial_transactions_userId_type_idx
- financial_transactions_userId_status_idx

✅ ÍNDICES ADICIONADOS (5):
- recurring_payments_paymentMethodId_idx
- recurring_payments_unidadeId_idx  
- user_permissions_userId_idx
- user_permissions_moduleId_idx
- financial_transactions_createdAt_idx
- financial_transactions_paidDate_idx

🎯 BENEFÍCIOS:
- Redução de 7 índices desnecessários
- Melhoria na performance de INSERT/UPDATE
- Redução do uso de disco
- Manutenção dos índices críticos para consultas
- Adição de índices úteis para consultas específicas
*/ 