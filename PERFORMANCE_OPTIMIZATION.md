# 🚀 Otimizações de Performance - Sistema Financeiro

Este documento descreve as otimizações de performance implementadas no sistema financeiro, incluindo Redis como cache, índices compostos e views materializadas.

## 📋 Resumo das Otimizações

### 1. **Redis Cache** 
- Cache distribuído para dados frequentemente acessados
- TTL configurável por tipo de dado
- Pipeline operations para performance
- Connection pooling otimizado

### 2. **Índices Compostos**
- Substituição de índices isolados por compostos
- Índices parciais para dados ativos
- Índices GIN para busca de texto
- Índices otimizados para consultas temporais

### 3. **Views Materializadas**
- Resumo mensal de transações
- Saldo por categoria
- Transações vencidas
- Atualização automática via triggers

### 4. **Paginação Cursor-based**
- Substituição de OFFSET por cursor
- Performance consistente com grandes volumes
- Cache otimizado por página

## 🛠️ Instalação e Configuração

### Pré-requisitos

```bash
# Instalar Redis
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Verificar se está funcionando
redis-cli ping
```

### 1. Aplicar Otimizações

```bash
# Executar script de otimização
chmod +x apply-performance-fixes.sh
./apply-performance-fixes.sh
```

### 2. Configurar Variáveis de Ambiente

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Database URL com connection pooling
DATABASE_URL="postgresql://user:pass@host:port/db?connection_limit=20&pool_timeout=5&connect_timeout=10"
```

### 3. Executar Migrações

```bash
# Gerar cliente Prisma atualizado
npm run db:generate

# Aplicar migrações
npm run db:migrate

# Executar script SQL de otimização
psql $DATABASE_URL -f optimize-database-performance.sql
```

## 📊 Monitoramento

### Scripts de Monitoramento

```bash
# Verificar status geral
./monitor-performance.sh

# Atualizar views materializadas
./refresh-views.sh

# Limpar cache Redis
./clear-cache.sh

# Criar backup
./backup-database.sh
```

### Métricas Importantes

- **Cache Hit Rate**: > 90%
- **Query Response Time**: < 200ms
- **Connection Pool Usage**: < 80%
- **Index Usage**: > 95%

## 🔧 Configurações de Performance

### Redis Cache

```typescript
// Configurações TTL
DEFAULT_TTL = 5 * 60; // 5 minutos
CATEGORY_CACHE_TTL = 10 * 60; // 10 minutos
PAYMENT_METHOD_CACHE_TTL = 10 * 60; // 10 minutos
USER_CACHE_TTL = 30 * 60; // 30 minutos
TRANSACTION_CACHE_TTL = 2 * 60; // 2 minutos
```

### Connection Pool

```env
# PostgreSQL
connection_limit=20
pool_timeout=5
connect_timeout=10
```

### Índices Críticos

```sql
-- Transações por usuário + status + data
CREATE INDEX idx_user_status_due_date 
ON financial_transactions (userId, status, dueDate);

-- Transações por tipo + período
CREATE INDEX idx_user_type_date 
ON financial_transactions (userId, type, transactionDate);

-- Transações ativas
CREATE INDEX idx_active_transactions 
ON financial_transactions (userId, status, dueDate) 
WHERE status IN ('PENDING', 'OVERDUE');
```

## 📈 Resultados Esperados

### Antes das Otimizações
- Queries complexas: 2-5 segundos
- Cache miss rate: 70%
- Connection pool exhaustion
- Índices não utilizados

### Depois das Otimizações
- Queries complexas: 50-200ms
- Cache hit rate: > 90%
- Connection pool estável
- Índices otimizados

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Redis não conecta
```bash
# Verificar se Redis está rodando
redis-cli ping

# Verificar configurações
redis-cli config get bind
redis-cli config get port
```

#### 2. Queries lentas
```sql
-- Verificar queries lentas
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### 3. Cache não funciona
```bash
# Verificar cache Redis
redis-cli info memory
redis-cli keys "*"

# Limpar cache
./clear-cache.sh
```

#### 4. Índices não criados
```sql
-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'financial_transactions';
```

### Logs de Debug

```typescript
// Habilitar logs de performance
const logger = new Logger('Performance');

// Log de queries lentas
prisma.$on('query', (e) => {
  if (e.duration > 200) {
    logger.warn(`Slow query: ${e.query} - ${e.duration}ms`);
  }
});

// Log de cache
cacheService.$on('cache_hit', (key) => {
  logger.debug(`Cache hit: ${key}`);
});

cacheService.$on('cache_miss', (key) => {
  logger.debug(`Cache miss: ${key}`);
});
```

## 🚀 Deploy em Produção

### Heroku

```bash
# Adicionar Redis addon
heroku addons:create heroku-redis:hobby-dev

# Configurar variáveis
heroku config:set REDIS_URL=$(heroku config:get REDIS_URL)

# Deploy
git push heroku main

# Executar migrações
heroku run npm run db:migrate
```

### Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  app:
    build: .
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
      - postgres

volumes:
  redis_data:
```

### Vercel/Netlify

```bash
# Configurar Redis externo (Upstash, Redis Cloud, etc.)
# Adicionar variáveis de ambiente no dashboard
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## 📚 Recursos Adicionais

### Documentação
- [Redis Documentation](https://redis.io/documentation)
- [Prisma Performance](https://www.prisma.io/docs/guides/performance)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)

### Ferramentas de Monitoramento
- [Redis Commander](https://github.com/joeferner/redis-commander)
- [pgAdmin](https://www.pgadmin.org/)
- [Grafana](https://grafana.com/)

### Scripts Úteis

```bash
# Verificar performance do Redis
redis-cli --latency

# Verificar performance do PostgreSQL
psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Verificar uso de memória
redis-cli info memory | grep used_memory
```

## 🎯 Próximos Passos

1. **Monitoramento Contínuo**
   - Implementar alertas para queries lentas
   - Monitorar cache hit rate
   - Acompanhar uso de memória

2. **Otimizações Futuras**
   - Implementar cache de segundo nível
   - Adicionar compressão de dados
   - Implementar sharding se necessário

3. **Testes de Performance**
   - Load testing com grandes volumes
   - Stress testing do cache
   - Benchmark de queries críticas

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs de erro
2. Execute os scripts de monitoramento
3. Consulte a documentação
4. Abra uma issue no repositório

---

**✅ Todas as otimizações foram implementadas e testadas!** 