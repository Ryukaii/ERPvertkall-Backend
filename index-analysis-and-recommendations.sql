-- =====================================================
-- ANÁLISE DE ÍNDICES - RECOMENDAÇÕES DE OTIMIZAÇÃO
-- =====================================================

-- =====================================================
-- 1. ÍNDICES REDUNDANTES QUE PODEM SER REMOVIDOS
-- =====================================================

-- 1.1 Índices únicos que já existem como PRIMARY KEY
-- Estes são redundantes pois o PostgreSQL automaticamente cria índices para PRIMARY KEYs
-- REMOVER:
-- - financial_categories_name_key (já existe unique constraint)
-- - payment_methods_name_key (já existe unique constraint)
-- - tags_name_key (já existe unique constraint)
-- - users_email_key (já existe unique constraint)

-- 1.2 Índices duplicados em tabelas de relacionamento
-- REMOVER:
-- - financial_transaction_tags_financialTransactionId_tagId_idx (redundante com unique constraint)
-- - ofx_pending_transaction_tags_ofxPendingTransactionId_tagId_idx (redundante com unique constraint)

-- =====================================================
-- 2. ÍNDICES POUCO EFETIVOS QUE PODEM SER REMOVIDOS
-- =====================================================

-- 2.1 Índices em colunas com baixa seletividade
-- REMOVER:
-- - financial_transactions_userId_type_idx (muito genérico, substituído por índices compostos)
-- - financial_transactions_userId_status_idx (muito genérico, substituído por índices compostos)

-- =====================================================
-- 3. COMANDOS PARA REMOÇÃO DE ÍNDICES REDUNDANTES
-- =====================================================

-- Remover índices únicos redundantes (já existem como constraints)
DROP INDEX IF EXISTS financial_categories_name_key;
DROP INDEX IF EXISTS payment_methods_name_key;
DROP INDEX IF EXISTS tags_name_key;
DROP INDEX IF EXISTS users_email_key;

-- Remover índices duplicados em tabelas de relacionamento
DROP INDEX IF EXISTS financial_transaction_tags_financialTransactionId_tagId_idx;
DROP INDEX IF EXISTS ofx_pending_transaction_tags_ofxPendingTransactionId_tagId_idx;

-- Remover índices pouco efetivos
DROP INDEX IF EXISTS financial_transactions_userId_type_idx;
DROP INDEX IF EXISTS financial_transactions_userId_status_idx;

-- =====================================================
-- 4. ÍNDICES QUE DEVEM SER MANTIDOS (CRÍTICOS)
-- =====================================================

-- Índices essenciais para performance:
-- ✓ financial_transactions_userId_status_dueDate_idx (consultas de dashboard)
-- ✓ financial_transactions_userId_categoryId_status_idx (filtros por categoria)
-- ✓ financial_transactions_userId_type_transactionDate_idx (relatórios)
-- ✓ financial_transactions_bankId_transactionDate_idx (consultas de banco)
-- ✓ financial_transactions_ofxImportId_idx (importações OFX)
-- ✓ financial_transactions_originalTransactionId_idx (transações recorrentes)
-- ✓ financial_transactions_transferFromBankId_idx (transferências)
-- ✓ financial_transactions_transferToBankId_idx (transferências)
-- ✓ financial_transactions_linkedTransactionId_idx (transações vinculadas)
-- ✓ ofx_imports_bankId_status_idx (status de importação)
-- ✓ ofx_imports_importDate_idx (consultas por data)
-- ✓ ofx_pending_transactions_ofxImportId_transactionDate_idx (transações pendentes)
-- ✓ ofx_pending_transactions_suggestedCategoryId_confidence_idx (categorização)
-- ✓ banks_isActive_document_idx (consultas de banco)
-- ✓ banks_holderName_idx (consultas por titular)
-- ✓ tags_name_isActive_idx (consultas de tags)

-- =====================================================
-- 5. ÍNDICES SUGERIDOS PARA ADICIONAR (OPCIONAIS)
-- =====================================================

-- Índices para melhorar performance de consultas específicas:

-- Para consultas de pagamentos recorrentes
CREATE INDEX IF NOT EXISTS recurring_payments_paymentMethodId_idx ON recurring_payments(paymentMethodId);
CREATE INDEX IF NOT EXISTS recurring_payments_unidadeId_idx ON recurring_payments(unidadeId);

-- Para consultas de permissões de usuário
CREATE INDEX IF NOT EXISTS user_permissions_userId_idx ON user_permissions(userId);
CREATE INDEX IF NOT EXISTS user_permissions_moduleId_idx ON user_permissions(moduleId);

-- Para consultas de transações por data de criação (útil para auditoria)
CREATE INDEX IF NOT EXISTS financial_transactions_createdAt_idx ON financial_transactions(createdAt);

-- Para consultas de transações por data de pagamento
CREATE INDEX IF NOT EXISTS financial_transactions_paidDate_idx ON financial_transactions(paidDate);

-- =====================================================
-- 6. RESUMO DA OTIMIZAÇÃO
-- =====================================================

/*
ÍNDICES A REMOVER (7 índices):
- financial_categories_name_key
- payment_methods_name_key  
- tags_name_key
- users_email_key
- financial_transaction_tags_financialTransactionId_tagId_idx
- ofx_pending_transaction_tags_ofxPendingTransactionId_tagId_idx
- financial_transactions_userId_type_idx
- financial_transactions_userId_status_idx

ÍNDICES A MANTER (25 índices):
- Todos os PRIMARY KEYs (automáticos)
- Índices compostos críticos para performance
- Índices únicos essenciais

ÍNDICES SUGERIDOS PARA ADICIONAR (5 índices):
- recurring_payments_paymentMethodId_idx
- recurring_payments_unidadeId_idx  
- user_permissions_userId_idx
- user_permissions_moduleId_idx
- financial_transactions_createdAt_idx
- financial_transactions_paidDate_idx

BENEFÍCIOS:
- Redução de 7 índices desnecessários
- Melhoria na performance de INSERT/UPDATE
- Redução do uso de disco
- Manutenção dos índices críticos para consultas
*/

-- =====================================================
-- 7. VERIFICAÇÃO DE ÍNDICES APÓS OTIMIZAÇÃO
-- =====================================================

-- Comando para verificar índices após as mudanças:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname; 