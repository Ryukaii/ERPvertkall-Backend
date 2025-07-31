-- Script de Correções de Performance do Supabase
-- Execute este script no SQL Editor do Supabase
-- Baseado nas sugestões do Database Linter

-- =====================================================
-- 1. ADICIONAR ÍNDICES FALTANTES PARA FOREIGN KEYS
-- =====================================================

-- Índice para recurring_payments.paymentMethodId
CREATE INDEX IF NOT EXISTS idx_recurring_payments_payment_method_id 
ON recurring_payments(payment_method_id);

-- Índice para recurring_payments.unidadeId
CREATE INDEX IF NOT EXISTS idx_recurring_payments_unidade_id 
ON recurring_payments(unidade_id);

-- Índice para user_permissions.moduleId
CREATE INDEX IF NOT EXISTS idx_user_permissions_module_id 
ON user_permissions(module_id);

-- =====================================================
-- 2. REMOVER ÍNDICES NÃO UTILIZADOS
-- =====================================================

-- Remover índices não utilizados da tabela banks
DROP INDEX IF EXISTS banks_document_idx;
DROP INDEX IF EXISTS banks_holderName_idx;
DROP INDEX IF EXISTS banks_isActive_idx;

-- Remover índices não utilizados da tabela financial_transactions
DROP INDEX IF EXISTS financial_transactions_userId_dueDate_idx;
DROP INDEX IF EXISTS financial_transactions_paymentMethodId_idx;
DROP INDEX IF EXISTS financial_transactions_transferFromBankId_idx;
DROP INDEX IF EXISTS financial_transactions_transferToBankId_idx;

-- Remover índices não utilizados da tabela ofx_imports
DROP INDEX IF EXISTS ofx_imports_bankId_idx;
DROP INDEX IF EXISTS ofx_imports_status_idx;

-- Remover índices não utilizados da tabela tags
DROP INDEX IF EXISTS tags_isActive_idx;

-- Remover índices não utilizados da tabela financial_transaction_tags
DROP INDEX IF EXISTS financial_transaction_tags_financialTransactionId_idx;

-- Remover índices não utilizados da tabela ofx_pending_transaction_tags
DROP INDEX IF EXISTS ofx_pending_transaction_tags_ofxPendingTransactionId_idx;

-- Remover índices não utilizados da tabela ofx_pending_transactions
DROP INDEX IF EXISTS ofx_pending_transactions_suggestedPaymentMethodId_idx;
DROP INDEX IF EXISTS ofx_pending_transactions_finalPaymentMethodId_idx;

-- =====================================================
-- 3. CRIAR ÍNDICES COMPOSTOS MAIS EFICIENTES
-- =====================================================

-- Índice composto para financial_transactions (usuário + data de vencimento)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_due_date 
ON financial_transactions(user_id, due_date DESC);

-- Índice composto para financial_transactions (usuário + status)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_status 
ON financial_transactions(user_id, status);

-- Índice composto para financial_transactions (banco + data de transação)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_bank_transaction_date 
ON financial_transactions(bank_id, transaction_date DESC);

-- Índice composto para financial_transactions (categoria + data)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category_date 
ON financial_transactions(category_id, due_date DESC);

-- Índice composto para financial_transactions (método de pagamento + data)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_payment_method_date 
ON financial_transactions(payment_method_id, due_date DESC);

-- Índice composto para user_permissions (usuário + módulo)
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module 
ON user_permissions(user_id, module_id);

-- Índice composto para recurring_payments (usuário + método de pagamento)
CREATE INDEX IF NOT EXISTS idx_recurring_payments_user_payment_method 
ON recurring_payments(user_id, payment_method_id);

-- Índice composto para recurring_payments (unidade + status)
CREATE INDEX IF NOT EXISTS idx_recurring_payments_unidade_status 
ON recurring_payments(unidade_id, status);

-- =====================================================
-- 4. ÍNDICES PARA CONSULTAS FREQUENTES
-- =====================================================

-- Índice para transações por tipo
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type 
ON financial_transactions(type);

-- Índice para transações por status
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status 
ON financial_transactions(status);

-- Índice para transações recorrentes
CREATE INDEX IF NOT EXISTS idx_financial_transactions_recurring 
ON financial_transactions(is_recurring, original_transaction_id);

-- Índice para transferências
CREATE INDEX IF NOT EXISTS idx_financial_transactions_transfer 
ON financial_transactions(transfer_from_bank_id, transfer_to_bank_id);

-- Índice para importações OFX
CREATE INDEX IF NOT EXISTS idx_financial_transactions_ofx_import 
ON financial_transactions(ofx_import_id, transaction_date DESC);

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
-- 5. VERIFICAÇÃO E ESTATÍSTICAS
-- =====================================================

-- Atualizar estatísticas das tabelas
ANALYZE financial_transactions;
ANALYZE users;
ANALYZE financial_categories;
ANALYZE payment_methods;
ANALYZE banks;
ANALYZE user_permissions;
ANALYZE financial_transaction_tags;
ANALYZE ofx_imports;
ANALYZE ofx_pending_transactions;
ANALYZE recurring_payments;
ANALYZE tags;

-- =====================================================
-- 6. VERIFICAÇÃO DOS ÍNDICES CRIADOS
-- =====================================================

-- Verificar índices existentes
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
    'ofx_pending_transactions',
    'recurring_payments',
    'tags'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- 7. ESTATÍSTICAS DE PERFORMANCE
-- =====================================================

-- Verificar tamanho das tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'financial_transactions',
    'users', 
    'financial_categories',
    'payment_methods',
    'banks',
    'user_permissions',
    'financial_transaction_tags',
    'ofx_imports',
    'ofx_pending_transactions',
    'recurring_payments',
    'tags'
)
ORDER BY size_bytes DESC;

-- =====================================================
-- 8. VERIFICAÇÃO DE FOREIGN KEYS SEM ÍNDICES
-- =====================================================

-- Verificar se ainda há foreign keys sem índices
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'financial_transactions',
        'users', 
        'financial_categories',
        'payment_methods',
        'banks',
        'user_permissions',
        'financial_transaction_tags',
        'ofx_imports',
        'ofx_pending_transactions',
        'recurring_payments',
        'tags'
    )
ORDER BY tc.table_name, tc.constraint_name; 