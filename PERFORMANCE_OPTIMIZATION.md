# Otimizações de Performance - Supabase

## 🚨 Problemas Identificados

Baseado no relatório de consultas lentas do Supabase, foram identificados os seguintes problemas:

### 1. Consultas Muito Lentas
- **CREATE DATABASE** para shadow databases: 1.3-2.3 segundos
- **SELECT name FROM pg_timezone_names**: 52-532ms (86 chamadas)
- **Complex queries com CTEs**: 78-191ms (100+ chamadas)

### 2. Problemas de Connection Pooling
- Muitas conexões simultâneas
- Timeouts de conexão
- Prepared statements não compatíveis com PgBouncer

## 🔧 Otimizações Implementadas

### 1. Configuração do PrismaService

#### Connection Pooling Otimizado
```typescript
// Reduzido de 5 para 3 conexões
url.searchParams.set('connection_limit', '3');

// Reduzido timeout de 30 para 20 segundos
url.searchParams.set('pool_timeout', '20');

// Adicionado timeout de sessão
url.searchParams.set('idle_in_transaction_session_timeout', '30000');
url.searchParams.set('statement_timeout', '30000');
```

#### Logging Otimizado
```typescript
// Em produção: apenas erros
log: isProduction ? ['error'] : ['error', 'warn']

// Threshold de queries lentas reduzido
const slowThreshold = isProduction ? 500 : 1000;
```

### 2. Métodos Otimizados de Consulta

#### findManyOptimized
```typescript
async findManyOptimized(model: any, args: any, options?: {
  useRetry?: boolean;
  maxRetries?: number;
}) {
  const { useRetry = true, maxRetries = 2 } = options || {};
  
  if (useRetry) {
    return this.executeWithRetry(() => model.findMany(args), maxRetries);
  }
  
  return model.findMany(args);
}
```

#### Batch Operations
```typescript
async batchOperation<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  
  for (const operation of operations) {
    try {
      const result = await this.executeWithRetry(operation);
      results.push(result);
    } catch (error) {
      this.logger.error('Batch operation failed:', error);
      throw error;
    }
  }
  
  return results;
}
```

### 3. Otimização de Consultas Específicas

#### FinancialTransactionService.findAll()
**Antes:**
```typescript
const transactions = await this.prisma.financialTransaction.findMany({
  where,
  include: {
    category: true,
    paymentMethod: true,
    user: { select: { id: true, name: true, email: true } },
  },
  orderBy: { dueDate: 'desc' },
});
```

**Depois:**
```typescript
const transactions = await this.prisma.findManyOptimized(
  this.prisma.financialTransaction,
  {
    where,
    select: {
      id: true,
      title: true,
      description: true,
      amount: true,
      // ... campos específicos
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
      },
      paymentMethod: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { dueDate: 'desc' },
    skip: offset,
    take: limit,
  },
  { useRetry: true, maxRetries: 2 }
);
```

### 4. Paginação Implementada

#### DTOs Atualizados
```typescript
export class FilterFinancialTransactionDto {
  // ... outros campos

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
```

### 5. Seleção Específica de Campos

**Benefícios:**
- Reduz volume de dados transferidos
- Melhora performance de serialização
- Diminui uso de memória

**Implementado em:**
- `FinancialTransactionService.findAll()`
- `BankTransactionService.findAll()`
- `BankTransactionService.findAllTransactions()`

## 📊 Resultados Esperados

### 1. Redução de Tempo de Consulta
- **Antes:** 100-500ms por consulta
- **Depois:** 20-100ms por consulta

### 2. Melhor Gestão de Conexões
- **Connection limit:** 3 (reduzido de 5)
- **Pool timeout:** 20s (reduzido de 30s)
- **Session timeout:** 30s

### 3. Paginação
- **Default limit:** 50 registros por página
- **Max limit:** 100 registros por página
- **Skip/Take:** Implementado para todas as consultas

## 🚀 Próximos Passos

### 1. Monitoramento
```bash
# Verificar logs de performance
heroku logs --tail | grep "Slow query"

# Monitorar métricas do Supabase
# Dashboard > Analytics > Query Performance
```

### 2. Índices Adicionais (se necessário)
```sql
-- Índices compostos para consultas frequentes
CREATE INDEX idx_financial_transactions_user_date 
ON financial_transactions(user_id, due_date DESC);

CREATE INDEX idx_financial_transactions_bank_date 
ON financial_transactions(bank_id, transaction_date DESC);
```

### 3. Correções do Database Linter
Execute o script `supabase-performance-fixes.sql` para:
- Adicionar índices faltantes para foreign keys
- Remover índices não utilizados
- Criar índices compostos mais eficientes

### 4. Cache (futuro)
- Implementar Redis para cache de consultas frequentes
- Cache de categorias e métodos de pagamento
- Cache de resumos de dashboard

## 🔍 Como Monitorar

### 1. Logs da Aplicação
```bash
# Verificar queries lentas
heroku logs --tail | grep "Slow query"

# Verificar erros de conexão
heroku logs --tail | grep "Connection pool timeout"
```

### 2. Supabase Dashboard
- **Analytics > Query Performance**
- **Database > Logs**
- **Settings > Database > Connection Pooling**

### 3. Métricas Importantes
- Tempo médio de consulta
- Número de conexões ativas
- Queries com timeout
- Uso de memória

## ⚠️ Observações Importantes

1. **Prepared Statements:** Desabilitados para compatibilidade com PgBouncer
2. **Connection Limit:** Reduzido para evitar sobrecarga
3. **Retry Logic:** Implementado para queries críticas
4. **Select vs Include:** Preferir `select` específico sobre `include` completo

## 📈 Benefícios Esperados

- **50-70%** redução no tempo de consulta
- **30-40%** redução no uso de conexões
- **Melhor estabilidade** em picos de tráfego
- **Experiência do usuário** mais responsiva 