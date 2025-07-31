-- Script de Otimização de Performance para Supabase
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. ÍNDICES PARA OTIMIZAR CONSULTAS FREQUENTES
-- =====================================================

-- Índice composto para transações financeiras por usuário e data
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_due_date 
ON financial_transactions(user_id, due_date DESC);

-- Índice composto para transações bancárias por banco e data
CREATE INDEX IF NOT EXISTS idx_financial_transactions_bank_transaction_date 
ON financial_transactions(bank_id, transaction_date DESC);

-- Índice para transações por status
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status 
ON financial_transactions(status);

-- Índice para transações por tipo
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type 
ON financial_transactions(type);

-- Índice para transações recorrentes
CREATE INDEX IF NOT EXISTS idx_financial_transactions_recurring 
ON financial_transactions(is_recurring, original_transaction_id);

-- Índice para transferências
CREATE INDEX IF NOT EXISTS idx_financial_transactions_transfer 
ON financial_transactions(transfer_from_bank_id, transfer_to_bank_id);

-- Índice para importações OFX
CREATE INDEX IF NOT EXISTS idx_financial_transactions_ofx_import 
ON financial_transactions(ofx_import_id, transaction_date DESC);

-- Índice para categorias
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category 
ON financial_transactions(category_id);

-- Índice para métodos de pagamento
CREATE INDEX IF NOT EXISTS idx_financial_transactions_payment_method 
ON financial_transactions(payment_method_id);

-- =====================================================
-- 2. ÍNDICES PARA TABELAS RELACIONADAS
-- =====================================================

-- Índice para permissões de usuário
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module 
ON user_permissions(user_id, module_id);

-- Índice para tags de transações
CREATE INDEX IF NOT EXISTS idx_financial_transaction_tags 
ON financial_transaction_tags(financial_transaction_id, tag_id);

-- Índice para transações pendentes OFX
CREATE INDEX IF NOT EXISTS idx_ofx_pending_transactions_import 
ON ofx_pending_transactions(ofx_import_id, transaction_date DESC);

-- Índice para importações OFX por banco
CREATE INDEX IF NOT EXISTS idx_ofx_imports_bank_date 
ON ofx_imports(bank_id, import_date DESC);

-- =====================================================
-- 3. CONFIGURAÇÕES DE PERFORMANCE
-- =====================================================

-- Configurar estatísticas de tabelas para melhor planejamento de queries
ANALYZE financial_transactions;
ANALYZE users;
ANALYZE financial_categories;
ANALYZE payment_methods;
ANALYZE banks;
ANALYZE user_permissions;
ANALYZE financial_transaction_tags;
ANALYZE ofx_imports;
ANALYZE ofx_pending_transactions;

-- =====================================================
-- 4. LIMPEZA DE DADOS (OPCIONAL)
-- =====================================================

-- Remover transações órfãs (sem usuário)
-- DELETE FROM financial_transactions WHERE user_id NOT IN (SELECT id FROM users);

-- Remover tags órfãs (sem transação)
-- DELETE FROM financial_transaction_tags WHERE financial_transaction_id NOT IN (SELECT id FROM financial_transactions);

-- =====================================================
-- 5. VERIFICAÇÃO DE ÍNDICES
-- =====================================================

-- Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'financial_transactions',
    'users', 
    'financial_categories',
    'payment_methods',
    'banks',
    'user_permissions',
    'financial_transaction_tags',
    'ofx_imports',
    'ofx_pending_transactions'
)
ORDER BY tablename, indexname;

-- =====================================================
-- 6. ESTATÍSTICAS DE PERFORMANCE
-- =====================================================

-- Verificar tamanho das tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Verificar estatísticas de uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC; 