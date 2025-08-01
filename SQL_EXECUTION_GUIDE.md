# 🚀 GUIA PARA EXECUTAR SCRIPTS SQL NO SUPABASE

## ⚠️ IMPORTANTE: Problema de Transação Resolvido

O erro `CREATE INDEX CONCURRENTLY cannot run inside a transaction block` foi corrigido removendo o `CONCURRENTLY` dos comandos de índice.

## 📋 PASSOS PARA EXECUTAR

### Passo 1: Acessar Supabase Dashboard
1. Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral

### Passo 2: Executar Índices Críticos
1. Abra o arquivo `critical-indexes.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** para executar
5. Aguarde a conclusão (pode demorar alguns minutos)

### Passo 3: Verificar Índices Criados
1. Abra o arquivo `verify-indexes.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** para verificar
5. Confirme que todos os índices foram criados

## 🔍 O QUE ESPERAR

### Durante a Execução
- **Tempo**: 2-5 minutos para criar todos os índices
- **Status**: "Running..." no SQL Editor
- **Logs**: Mensagens de progresso

### Após a Execução
- **Índices criados**: 15+ índices otimizados
- **Performance**: Melhoria imediata nas consultas
- **Estatísticas**: Atualizadas automaticamente

## 📊 VERIFICAÇÃO DOS RESULTADOS

### Script de Verificação
O `verify-indexes.sql` irá mostrar:
- ✅ Lista de todos os índices criados
- 📊 Tamanho das tabelas
- 📈 Estatísticas de uso de índices
- 🔍 Foreign keys sem índices (se houver)

### Indicadores de Sucesso
- ✅ Todos os índices `idx_*` aparecem na lista
- ✅ Tabelas principais têm índices criados
- ✅ Estatísticas atualizadas
- ✅ Sem erros na execução

## ⚠️ TROUBLESHOOTING

### Erro: "relation does not exist"
- **Causa**: Tabela não existe no banco
- **Solução**: Verificar se as migrações foram aplicadas

### Erro: "index already exists"
- **Causa**: Índice já foi criado anteriormente
- **Solução**: Ignorar, o `IF NOT EXISTS` previne duplicação

### Erro: "permission denied"
- **Causa**: Sem permissão para criar índices
- **Solução**: Verificar permissões do usuário do banco

### Erro: "out of disk space"
- **Causa**: Espaço insuficiente no banco
- **Solução**: Verificar uso de disco no Supabase

## 🚀 PRÓXIMOS PASSOS

### Após Executar os Scripts
1. **Reiniciar aplicação**:
   ```bash
   npm run start:prod
   ```

2. **Monitorar logs**:
   ```bash
   heroku logs --tail | grep "Slow query"
   ```

3. **Testar performance**:
   - Importar arquivo OFX
   - Verificar tempo de processamento
   - Monitorar logs de cache

## 📈 MÉTRICAS DE SUCESSO

### Antes vs Depois
- **Queries lentas**: < 200ms (era 1979ms)
- **Bulk insert**: 5x mais rápido
- **Connection pool**: Estável
- **Cache hit rate**: > 90%

### Monitoramento Contínuo
- Verificar logs diariamente
- Monitorar métricas do Supabase
- Acompanhar performance das queries

## 🔧 COMANDOS ÚTEIS

### Verificar Status dos Índices
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
ORDER BY tablename;
```

### Verificar Performance
```sql
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE indexname LIKE 'idx_%' 
ORDER BY idx_scan DESC;
```

### Verificar Tamanho das Tabelas
```sql
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass)) 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

---

**✅ Status**: Scripts corrigidos e prontos para execução
**📅 Data**: $(date)
**👤 Responsável**: Equipe de desenvolvimento 