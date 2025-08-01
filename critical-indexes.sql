-- ÍNDICES CRÍTICOS PARA PERFORMANCE
-- Execute este script no SQL Editor do Supabase para resolver problemas de lentidão
-- IMPORTANTE: Execute cada seção separadamente para evitar problemas de transação

-- =====================================================
-- 1. ÍNDICES CRÍTICOS PARA FINANCIAL_TRANSACTIONS
-- =====================================================

-- Índice composto para consultas mais frequentes (usuário + data + status)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_date_status 
ON financial_transactions(user_id, due_date DESC, status);

-- Índice composto para consultas por banco e data
CREATE INDEX IF NOT EXISTS idx_financial_transactions_bank_date 
ON financial_transactions(bank_id, transaction_date DESC);

-- Índice para consultas por categoria
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category 
ON financial_transactions(category_id);

-- Índice para consultas por método de pagamento
CREATE INDEX IF NOT EXISTS idx_financial_transactions_payment_method 
ON financial_transactions(payment_method_id);

-- Índice para consultas por tipo
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type 
ON financial_transactions(type);

-- Índice para consultas por status
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status 
ON financial_transactions(status);

-- =====================================================
-- 2. ÍNDICES CRÍTICOS PARA OFX_PENDING_TRANSACTIONS
-- =====================================================

-- Índice composto para importações OFX (import + data)
CREATE INDEX IF NOT EXISTS idx_ofx_pending_import_date 
ON ofx_pending_transactions(ofx_import_id, transaction_date DESC);

-- Índice para categorias sugeridas
CREATE INDEX IF NOT EXISTS idx_ofx_pending_suggested_category 
ON ofx_pending_transactions(suggested_category_id);

-- Índice para categorias finais
CREATE INDEX IF NOT EXISTS idx_ofx_pending_final_category 
ON ofx_pending_transactions(final_category_id);

-- Índice para métodos de pagamento sugeridos
CREATE INDEX IF NOT EXISTS idx_ofx_pending_suggested_payment_method 
ON ofx_pending_transactions(suggested_payment_method_id);

-- Índice para métodos de pagamento finais
CREATE INDEX IF NOT EXISTS idx_ofx_pending_final_payment_method 
ON ofx_pending_transactions(final_payment_method_id);

-- =====================================================
-- 3. ÍNDICES CRÍTICOS PARA CATEGORIAS E MÉTODOS
-- =====================================================

-- Índice para busca por nome de categoria
CREATE INDEX IF NOT EXISTS idx_financial_categories_name 
ON financial_categories(name);

-- Índice para busca por nome de método de pagamento
CREATE INDEX IF NOT EXISTS idx_payment_methods_name 
ON payment_methods(name);

-- Índice para métodos de pagamento ativos
CREATE INDEX IF NOT EXISTS idx_payment_methods_active 
ON payment_methods(is_active);

-- =====================================================
-- 4. ÍNDICES CRÍTICOS PARA IMPORTAÇÕES OFX
-- =====================================================

-- Índice composto para importações por banco e data
CREATE INDEX IF NOT EXISTS idx_ofx_imports_bank_date 
ON ofx_imports(bank_id, import_date DESC);

-- Índice para status de importação
CREATE INDEX IF NOT EXISTS idx_ofx_imports_status 
ON ofx_imports(status);

-- =====================================================
-- 5. ÍNDICES CRÍTICOS PARA USUÁRIOS E PERMISSÕES
-- =====================================================

-- Índice composto para permissões de usuário
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module 
ON user_permissions(user_id, module_id);

-- Índice para usuários aprovados
CREATE INDEX IF NOT EXISTS idx_users_approved 
ON users(is_approved);

-- =====================================================
-- 6. ÍNDICES CRÍTICOS PARA BANCOS
-- =====================================================

-- Índice para bancos ativos
CREATE INDEX IF NOT EXISTS idx_banks_active 
ON banks(is_active);

-- Índice para busca por documento
CREATE INDEX IF NOT EXISTS idx_banks_document 
ON banks(document);

-- =====================================================
-- 7. ATUALIZAR ESTATÍSTICAS
-- =====================================================

-- Atualizar estatísticas das tabelas principais
ANALYZE financial_transactions;
ANALYZE ofx_pending_transactions;
ANALYZE financial_categories;
ANALYZE payment_methods;
ANALYZE ofx_imports;
ANALYZE users;
ANALYZE user_permissions;
ANALYZE banks; 