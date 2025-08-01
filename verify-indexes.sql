-- VERIFICAÇÃO DOS ÍNDICES CRIADOS
-- Execute este script após aplicar critical-indexes.sql

-- =====================================================
-- 1. VERIFICAÇÃO DOS ÍNDICES CRIADOS
-- =====================================================

-- Verificar se os índices foram criados corretamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'financial_transactions',
    'ofx_pending_transactions',
    'financial_categories',
    'payment_methods',
    'ofx_imports',
    'users',
    'user_permissions',
    'banks'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- 2. ESTATÍSTICAS DE PERFORMANCE
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
    'ofx_pending_transactions',
    'financial_categories',
    'payment_methods',
    'ofx_imports',
    'users',
    'user_permissions',
    'banks'
)
ORDER BY size_bytes DESC;

-- =====================================================
-- 3. ESTATÍSTICAS DE USO DE ÍNDICES
-- =====================================================

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
AND tablename IN (
    'financial_transactions',
    'ofx_pending_transactions',
    'financial_categories',
    'payment_methods',
    'ofx_imports',
    'users',
    'user_permissions',
    'banks'
)
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- =====================================================
-- 4. VERIFICAÇÃO DE FOREIGN KEYS SEM ÍNDICES
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
        'ofx_pending_transactions',
        'financial_categories',
        'payment_methods',
        'ofx_imports',
        'users',
        'user_permissions',
        'banks'
    )
ORDER BY tc.table_name, tc.constraint_name; 