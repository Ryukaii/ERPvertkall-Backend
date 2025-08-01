-- =====================================================
-- SCRIPT DE OTIMIZAÇÃO DE PERFORMANCE DO BANCO DE DADOS
-- =====================================================

-- 1. REMOVER ÍNDICES ISOLADOS DESNECESSÁRIOS
-- =====================================================

-- Remover índices isolados que foram substituídos por compostos
DROP INDEX IF EXISTS "financial_transactions_userId_idx";
DROP INDEX IF EXISTS "financial_transactions_dueDate_idx";
DROP INDEX IF EXISTS "financial_transactions_status_idx";
DROP INDEX IF EXISTS "financial_transactions_type_idx";
DROP INDEX IF EXISTS "financial_transactions_isRecurring_idx";
DROP INDEX IF EXISTS "financial_transactions_bankId_idx";
DROP INDEX IF EXISTS "financial_transactions_transactionDate_idx";

-- Remover índices isolados de outras tabelas
DROP INDEX IF EXISTS "ofx_imports_bankId_idx";
DROP INDEX IF EXISTS "ofx_imports_status_idx";
DROP INDEX IF EXISTS "ofx_pending_transactions_ofxImportId_idx";
DROP INDEX IF EXISTS "ofx_pending_transactions_transactionDate_idx";
DROP INDEX IF EXISTS "banks_isActive_idx";
DROP INDEX IF EXISTS "banks_document_idx";
DROP INDEX IF EXISTS "tags_name_idx";
DROP INDEX IF EXISTS "tags_isActive_idx";

-- 2. CRIAR ÍNDICES PARCIAIS PARA DADOS ATIVOS
-- =====================================================

-- Índice parcial para transações ativas (pendentes e vencidas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_transactions 
ON "financial_transactions" ("userId", "status", "dueDate") 
WHERE "status" IN ('PENDING', 'OVERDUE');

-- Índice parcial para transações recorrentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_transactions 
ON "financial_transactions" ("userId", "isRecurring", "dueDate") 
WHERE "isRecurring" = true;

-- Índice parcial para transações de banco
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bank_transactions 
ON "financial_transactions" ("bankId", "transactionDate", "type") 
WHERE "bankId" IS NOT NULL;

-- 3. CRIAR VIEWS MATERIALIZADAS PARA RELATÓRIOS
-- =====================================================

-- View materializada para resumo mensal de transações
CREATE MATERIALIZED VIEW IF NOT EXISTS user_monthly_summary AS
SELECT 
  "userId",
  DATE_TRUNC('month', "transactionDate") AS month,
  "type",
  "status",
  COUNT(*) as transaction_count,
  SUM("amount") as total_amount,
  AVG("amount") as avg_amount
FROM "financial_transactions"
WHERE "transactionDate" IS NOT NULL
GROUP BY "userId", DATE_TRUNC('month', "transactionDate"), "type", "status";

-- Criar índice na view materializada
CREATE INDEX IF NOT EXISTS idx_user_monthly_summary 
ON user_monthly_summary ("userId", "month", "type");

-- View materializada para saldo por categoria
CREATE MATERIALIZED VIEW IF NOT EXISTS category_balance_summary AS
SELECT 
  "userId",
  "categoryId",
  c."name" as category_name,
  "type",
  COUNT(*) as transaction_count,
  SUM("amount") as total_amount
FROM "financial_transactions" ft
LEFT JOIN "financial_categories" c ON ft."categoryId" = c."id"
WHERE ft."categoryId" IS NOT NULL
GROUP BY "userId", "categoryId", c."name", "type";

-- Criar índice na view materializada
CREATE INDEX IF NOT EXISTS idx_category_balance_summary 
ON category_balance_summary ("userId", "categoryId", "type");

-- View materializada para transações vencidas
CREATE MATERIALIZED VIEW IF NOT EXISTS overdue_transactions_summary AS
SELECT 
  "userId",
  "type",
  COUNT(*) as overdue_count,
  SUM("amount") as overdue_amount,
  MIN("dueDate") as earliest_overdue,
  MAX("dueDate") as latest_overdue
FROM "financial_transactions"
WHERE "status" = 'OVERDUE' AND "dueDate" < CURRENT_DATE
GROUP BY "userId", "type";

-- Criar índice na view materializada
CREATE INDEX IF NOT EXISTS idx_overdue_transactions_summary 
ON overdue_transactions_summary ("userId", "type");

-- 4. CRIAR FUNÇÕES PARA ATUALIZAR VIEWS MATERIALIZADAS
-- =====================================================

-- Função para atualizar view de resumo mensal
CREATE OR REPLACE FUNCTION refresh_user_monthly_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_monthly_summary;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar view de saldo por categoria
CREATE OR REPLACE FUNCTION refresh_category_balance_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY category_balance_summary;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar view de transações vencidas
CREATE OR REPLACE FUNCTION refresh_overdue_transactions_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY overdue_transactions_summary;
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR TRIGGERS PARA ATUALIZAR VIEWS AUTOMATICAMENTE
-- =====================================================

-- Trigger para atualizar views quando transações são modificadas
CREATE OR REPLACE FUNCTION update_materialized_views()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar views em background (não bloquear a operação)
  PERFORM pg_notify('refresh_views', 'user_monthly_summary');
  PERFORM pg_notify('refresh_views', 'category_balance_summary');
  PERFORM pg_notify('refresh_views', 'overdue_transactions_summary');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela de transações
DROP TRIGGER IF EXISTS trigger_update_materialized_views ON "financial_transactions";
CREATE TRIGGER trigger_update_materialized_views
  AFTER INSERT OR UPDATE OR DELETE ON "financial_transactions"
  FOR EACH ROW EXECUTE FUNCTION update_materialized_views();

-- 6. CRIAR ÍNDICES PARA CONSULTAS DE TEXTO
-- =====================================================

-- Índice GIN para busca de texto em transações
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_text_search 
ON "financial_transactions" USING GIN (to_tsvector('portuguese', "title" || ' ' || COALESCE("description", '')));

-- 7. CRIAR ÍNDICES PARA CONSULTAS TEMPORAIS
-- =====================================================

-- Índice para consultas por período
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_date_range 
ON "financial_transactions" ("userId", "transactionDate", "type") 
WHERE "transactionDate" IS NOT NULL;

-- Índice para consultas de vencimento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_due_date_range 
ON "financial_transactions" ("userId", "dueDate", "status") 
WHERE "dueDate" IS NOT NULL;

-- 8. CRIAR ÍNDICES PARA RELACIONAMENTOS
-- =====================================================

-- Índice para transações vinculadas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_linked_transactions 
ON "financial_transactions" ("userId", "linkedTransactionId", "type") 
WHERE "linkedTransactionId" IS NOT NULL;

-- Índice para transações de transferência
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfer_transactions 
ON "financial_transactions" ("userId", "transferFromBankId", "transferToBankId", "type") 
WHERE "transferFromBankId" IS NOT NULL OR "transferToBankId" IS NOT NULL;

-- 9. CRIAR ÍNDICES PARA OFX
-- =====================================================

-- Índice para transações pendentes por confiança
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_transactions_confidence 
ON "ofx_pending_transactions" ("ofxImportId", "confidence", "transactionDate") 
WHERE "confidence" IS NOT NULL;

-- Índice para categorização de transações pendentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_categorization 
ON "ofx_pending_transactions" ("suggestedCategoryId", "confidence", "finalCategoryId") 
WHERE "suggestedCategoryId" IS NOT NULL;

-- 10. CRIAR ÍNDICES PARA TAGS
-- =====================================================

-- Índice para transações com tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_tags 
ON "financial_transaction_tags" ("financialTransactionId", "tagId");

-- Índice para transações pendentes com tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_transaction_tags 
ON "ofx_pending_transaction_tags" ("ofxPendingTransactionId", "tagId");

-- 11. CRIAR ÍNDICES PARA BANCOS
-- =====================================================

-- Índice para consultas de banco por documento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_banks_document_active 
ON "banks" ("document", "isActive") 
WHERE "isActive" = true;

-- 12. CRIAR ÍNDICES PARA USUÁRIOS E PERMISSÕES
-- =====================================================

-- Índice para permissões de usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions 
ON "user_permissions" ("userId", "moduleId", "isActive") 
WHERE "isActive" = true;

-- 13. CRIAR ÍNDICES PARA MÓDULOS
-- =====================================================

-- Índice para módulos ativos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_modules_active 
ON "modules" ("isActive", "name") 
WHERE "isActive" = true;

-- 14. CRIAR ÍNDICES PARA CATEGORIAS E MÉTODOS DE PAGAMENTO
-- =====================================================

-- Índice para categorias por tipo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_by_type 
ON "financial_categories" ("type", "name");

-- Índice para métodos de pagamento ativos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_active 
ON "payment_methods" ("isActive", "type", "name") 
WHERE "isActive" = true;

-- 15. CRIAR ÍNDICES PARA PAGAMENTOS RECORRENTES
-- =====================================================

-- Índice para pagamentos recorrentes por unidade
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_payments_unidade 
ON "recurring_payments" ("unidadeId", "recurrenceType") 
WHERE "unidadeId" IS NOT NULL;

-- 16. CRIAR ÍNDICES PARA UNIDADES
-- =====================================================

-- Índice para unidades por local
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unidades_by_local 
ON "unidades" ("local", "nome");

-- 17. CRIAR ÍNDICES PARA IMPORTAÇÕES OFX
-- =====================================================

-- Índice para importações por status e data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ofx_imports_status_date 
ON "ofx_imports" ("status", "importDate", "bankId");

-- 18. CRIAR ÍNDICES PARA TRANSACÇÕES PENDENTES OFX
-- =====================================================

-- Índice para transações pendentes por importação e data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_by_import_date 
ON "ofx_pending_transactions" ("ofxImportId", "transactionDate", "type");

-- 19. CRIAR ÍNDICES PARA CONSULTAS DE SALDO
-- =====================================================

-- Índice para cálculo de saldo por usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balance_calculation 
ON "financial_transactions" ("userId", "type", "status", "transactionDate") 
WHERE "transactionDate" IS NOT NULL;

-- 20. CRIAR ÍNDICES PARA CONSULTAS DE RELATÓRIOS
-- =====================================================

-- Índice para relatórios por período e tipo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_period_type 
ON "financial_transactions" ("userId", "transactionDate", "type", "status") 
WHERE "transactionDate" IS NOT NULL;

-- 21. CRIAR ÍNDICES PARA CONSULTAS DE DASHBOARD
-- =====================================================

-- Índice para dashboard por usuário e período
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_user_period 
ON "financial_transactions" ("userId", "transactionDate", "type", "categoryId") 
WHERE "transactionDate" IS NOT NULL;

-- 22. CRIAR ÍNDICES PARA CONSULTAS DE FILTROS
-- =====================================================

-- Índice para filtros combinados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_filters_combined 
ON "financial_transactions" ("userId", "type", "status", "categoryId", "paymentMethodId") 
WHERE "categoryId" IS NOT NULL OR "paymentMethodId" IS NOT NULL;

-- 23. CRIAR ÍNDICES PARA CONSULTAS DE BUSCA
-- =====================================================

-- Índice para busca por texto em transações
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_transactions 
ON "financial_transactions" USING GIN (to_tsvector('portuguese', "title" || ' ' || COALESCE("description", ''))) 
WHERE "userId" IS NOT NULL;

-- 24. CRIAR ÍNDICES PARA CONSULTAS DE ESTATÍSTICAS
-- =====================================================

-- Índice para estatísticas por categoria
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stats_by_category 
ON "financial_transactions" ("userId", "categoryId", "type", "status", "transactionDate") 
WHERE "categoryId" IS NOT NULL;

-- 25. CRIAR ÍNDICES PARA CONSULTAS DE EXPORTAÇÃO
-- =====================================================

-- Índice para exportação de dados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_export_data 
ON "financial_transactions" ("userId", "transactionDate", "type", "status", "categoryId", "paymentMethodId");

-- 26. CRIAR ÍNDICES PARA CONSULTAS DE AUDITORIA
-- =====================================================

-- Índice para auditoria de transações
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_transactions 
ON "financial_transactions" ("userId", "createdAt", "updatedAt", "type", "status");

-- 27. CRIAR ÍNDICES PARA CONSULTAS DE BACKUP
-- =====================================================

-- Índice para backup de dados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_backup_data 
ON "financial_transactions" ("userId", "transactionDate", "type", "status", "categoryId", "paymentMethodId", "bankId");

-- 28. CRIAR ÍNDICES PARA CONSULTAS DE MIGRAÇÃO
-- =====================================================

-- Índice para migração de dados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_migration_data 
ON "financial_transactions" ("userId", "transactionDate", "type", "status", "categoryId", "paymentMethodId", "bankId", "isRecurring");

-- 29. CRIAR ÍNDICES PARA CONSULTAS DE LIMPEZA
-- =====================================================

-- Índice para limpeza de dados antigos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cleanup_old_data 
ON "financial_transactions" ("transactionDate", "status", "type") 
WHERE "transactionDate" < CURRENT_DATE - INTERVAL '2 years';

-- 30. CRIAR ÍNDICES PARA CONSULTAS DE MANUTENÇÃO
-- =====================================================

-- Índice para manutenção de dados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_data 
ON "financial_transactions" ("userId", "transactionDate", "type", "status", "categoryId", "paymentMethodId", "bankId", "isRecurring", "originalTransactionId");

-- =====================================================
-- FIM DO SCRIPT DE OTIMIZAÇÃO
-- =====================================================

-- Verificar se todos os índices foram criados corretamente
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN (
  'financial_transactions',
  'ofx_pending_transactions',
  'ofx_imports',
  'banks',
  'financial_categories',
  'payment_methods',
  'tags',
  'financial_transaction_tags',
  'ofx_pending_transaction_tags',
  'users',
  'user_permissions',
  'modules',
  'recurring_payments',
  'unidades'
)
ORDER BY tablename, indexname;

-- Verificar o tamanho dos índices
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes 
WHERE tablename IN (
  'financial_transactions',
  'ofx_pending_transactions',
  'ofx_imports',
  'banks',
  'financial_categories',
  'payment_methods',
  'tags',
  'financial_transaction_tags',
  'ofx_pending_transaction_tags',
  'users',
  'user_permissions',
  'modules',
  'recurring_payments',
  'unidades'
)
ORDER BY pg_relation_size(indexrelid) DESC; 