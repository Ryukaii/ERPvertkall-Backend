# 🎯 Queries Essenciais do Sistema Financeiro

Este documento lista as **únicas queries** que devem ser mantidas e otimizadas no sistema, eliminando consultas desnecessárias e focando na performance.

## 📋 Categorias de Queries Essenciais

### 1. **Queries de Transações Financeiras** (CRUD Principal)

#### 1.1 Listar Transações com Paginação Cursor-based
```typescript
// ESSENCIAL: Lista transações do usuário com cache
async findAll(userId: string, filters: FilterDto, cursor?: string, limit: number = 50) {
  const where = this.buildWhereClause(userId, filters);
  
  return this.prisma.financialTransaction.findMany({
    where,
    select: {
      id: true,
      title: true,
      amount: true,
      type: true,
      status: true,
      dueDate: true,
      transactionDate: true,
      category: { select: { id: true, name: true, color: true } },
      paymentMethod: { select: { id: true, name: true } },
      bank: { select: { id: true, name: true, accountNumber: true } },
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor } }),
    orderBy: { id: 'asc' },
  });
}
```

#### 1.2 Buscar Transação por ID
```typescript
// ESSENCIAL: Busca transação específica com cache
async findOne(id: string, userId: string) {
  return this.prisma.financialTransaction.findFirst({
    where: { id, userId },
    include: {
      category: true,
      paymentMethod: true,
      bank: true,
      tags: { include: { tag: true } },
    },
  });
}
```

#### 1.3 Criar Transação
```typescript
// ESSENCIAL: Criar nova transação
async create(createDto: CreateDto, userId: string) {
  return this.prisma.financialTransaction.create({
    data: { ...createDto, userId },
    include: {
      category: true,
      paymentMethod: true,
      bank: true,
      tags: { include: { tag: true } },
    },
  });
}
```

#### 1.4 Atualizar Transação
```typescript
// ESSENCIAL: Atualizar transação existente
async update(id: string, updateDto: UpdateDto, userId: string) {
  return this.prisma.financialTransaction.update({
    where: { id, userId },
    data: updateDto,
    include: {
      category: true,
      paymentMethod: true,
      bank: true,
      tags: { include: { tag: true } },
    },
  });
}
```

#### 1.5 Remover Transação
```typescript
// ESSENCIAL: Remover transação
async remove(id: string, userId: string) {
  return this.prisma.financialTransaction.delete({
    where: { id, userId },
  });
}
```

### 2. **Queries de Dashboard** (Resumos e Métricas)

#### 2.1 Resumo Mensal (View Materializada)
```sql
-- ESSENCIAL: View materializada para resumo mensal
CREATE MATERIALIZED VIEW user_monthly_summary AS
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
```

#### 2.2 Saldo por Categoria (View Materializada)
```sql
-- ESSENCIAL: View materializada para saldo por categoria
CREATE MATERIALIZED VIEW category_balance_summary AS
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
```

#### 2.3 Transações Vencidas (View Materializada)
```sql
-- ESSENCIAL: View materializada para transações vencidas
CREATE MATERIALIZED VIEW overdue_transactions_summary AS
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
```

### 3. **Queries de Cache** (Dados Frequentes)

#### 3.1 Categorias (Cache Redis)
```typescript
// ESSENCIAL: Cache de categorias
async getCategoryId(name: string): Promise<string | null> {
  const key = `category:${name.toUpperCase()}`;
  return await this.redis.get(key);
}

async getCategoryName(id: string): Promise<string | null> {
  const key = `category:${id}`;
  return await this.redis.get(key);
}
```

#### 3.2 Métodos de Pagamento (Cache Redis)
```typescript
// ESSENCIAL: Cache de métodos de pagamento
async getPaymentMethodId(name: string): Promise<string | null> {
  const key = `payment_method:${name.toUpperCase()}`;
  return await this.redis.get(key);
}

async getPaymentMethodName(id: string): Promise<string | null> {
  const key = `payment_method:${id}`;
  return await this.redis.get(key);
}
```

#### 3.3 Usuário (Cache Redis)
```typescript
// ESSENCIAL: Cache de usuário
async getUser(userId: string): Promise<any | null> {
  const key = `user:${userId}`;
  return await this.redis.get(key);
}

async setUser(userId: string, userData: any): Promise<void> {
  const key = `user:${userId}`;
  await this.redis.setex(key, this.USER_CACHE_TTL, JSON.stringify(userData));
}
```

### 4. **Queries de Banco** (Transações Bancárias)

#### 4.1 Transações por Banco
```typescript
// ESSENCIAL: Transações de um banco específico
async findBankTransactions(bankId: string, filters: FilterDto, cursor?: string, limit: number = 50) {
  const where = { bankId, ...this.buildWhereClause(filters) };
  
  return this.prisma.financialTransaction.findMany({
    where,
    select: {
      id: true,
      title: true,
      amount: true,
      type: true,
      status: true,
      transactionDate: true,
      category: { select: { id: true, name: true } },
      paymentMethod: { select: { id: true, name: true } },
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor } }),
    orderBy: { transactionDate: 'desc' },
  });
}
```

#### 4.2 Saldo do Banco
```typescript
// ESSENCIAL: Calcular saldo do banco
async getBankBalance(bankId: string): Promise<number> {
  const result = await this.prisma.financialTransaction.aggregate({
    where: { bankId },
    _sum: { amount: true },
  });
  
  return result._sum.amount || 0;
}
```

### 5. **Queries de OFX** (Importação)

#### 5.1 Transações Pendentes por Importação
```typescript
// ESSENCIAL: Transações pendentes de uma importação
async getPendingTransactions(importId: string) {
  return this.prisma.ofxPendingTransaction.findMany({
    where: { ofxImportId: importId },
    include: {
      suggestedCategory: true,
      finalCategory: true,
      tags: { include: { tag: true } },
    },
    orderBy: { transactionDate: 'desc' },
  });
}
```

#### 5.2 Resumo da Importação
```typescript
// ESSENCIAL: Resumo de uma importação OFX
async getImportSummary(importId: string) {
  return this.prisma.ofxImport.findUnique({
    where: { id: importId },
    include: {
      bank: true,
      _count: { select: { pendingTransactions: true } },
    },
  });
}
```

### 6. **Queries de Tags** (Organização)

#### 6.1 Tags Ativas
```typescript
// ESSENCIAL: Listar tags ativas
async findActiveTags() {
  return this.prisma.tag.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}
```

#### 6.2 Tags por Transação
```typescript
// ESSENCIAL: Tags de uma transação
async getTransactionTags(transactionId: string) {
  return this.prisma.financialTransactionTag.findMany({
    where: { financialTransactionId: transactionId },
    include: { tag: true },
  });
}
```

## 🚫 Queries que DEVEM ser ELIMINADAS

### 1. **Queries Desnecessárias**
- ❌ `SELECT * FROM financial_transactions` (sem filtros)
- ❌ `findMany` sem `select` específico
- ❌ Queries com `include` completo desnecessário
- ❌ Queries sem paginação em grandes volumes

### 2. **Queries Ineficientes**
- ❌ Queries com `OFFSET` em vez de cursor
- ❌ Queries sem índices apropriados
- ❌ Queries que não usam cache
- ❌ Queries com joins desnecessários

### 3. **Queries Redundantes**
- ❌ Múltiplas queries para o mesmo dado
- ❌ Queries que podem ser substituídas por views materializadas
- ❌ Queries que podem ser cacheadas

## ✅ Queries Otimizadas com Cache

### 1. **Cache de Transações**
```typescript
// Cache de transações com TTL
async getTransactionsCache(userId: string, filters: any, cursor?: string) {
  const key = `transactions:${userId}:${JSON.stringify(filters)}:${cursor || 'first'}`;
  return await this.cacheService.get(key);
}
```

### 2. **Cache de Dashboard**
```typescript
// Cache de dashboard com TTL
async getDashboardCache(userId: string, period: string) {
  const key = `dashboard:${userId}:${period}`;
  return await this.cacheService.get(key);
}
```

### 3. **Cache de Contadores**
```typescript
// Cache de contadores com TTL longo
async getCountCache(userId: string, filters: any) {
  const key = `count:${userId}:${JSON.stringify(filters)}`;
  return await this.cacheService.get(key);
}
```

## 🎯 Resumo das Queries Essenciais

### **Total: 15 Queries Principais**

1. **Transações:**
   - `findAll` (com cursor-based pagination)
   - `findOne` (com cache)
   - `create` (com invalidação de cache)
   - `update` (com invalidação de cache)
   - `remove` (com invalidação de cache)

2. **Dashboard:**
   - `getMonthlySummary` (view materializada)
   - `getCategoryBalance` (view materializada)
   - `getOverdueTransactions` (view materializada)

3. **Cache:**
   - `getCategoryId/Name` (Redis)
   - `getPaymentMethodId/Name` (Redis)
   - `getUser` (Redis)

4. **Banco:**
   - `findAll` (transações por banco específico com cursor)
   - `getBankBalance` (aggregate)

5. **OFX:**
   - `getPendingTransactions` (por importação)
   - `getImportSummary` (resumo)

6. **Tags:**
   - `findActiveTags` (cache)
   - `getTransactionTags` (por transação)

## 🔧 Otimizações Aplicadas

### 1. **Índices Compostos**
```sql
-- Para transações
@@index([userId, status, dueDate])
@@index([userId, type, transactionDate])
@@index([bankId, transactionDate])

-- Para OFX
@@index([ofxImportId, transactionDate])
@@index([suggestedCategoryId, confidence])
```

### 2. **Views Materializadas**
```sql
-- Resumos pré-calculados
CREATE MATERIALIZED VIEW user_monthly_summary AS ...
CREATE MATERIALIZED VIEW category_balance_summary AS ...
CREATE MATERIALIZED VIEW overdue_transactions_summary AS ...
```

### 3. **Cache Redis**
```typescript
// TTLs otimizados
DEFAULT_TTL = 5 * 60; // 5 minutos
CATEGORY_CACHE_TTL = 10 * 60; // 10 minutos
USER_CACHE_TTL = 30 * 60; // 30 minutos
TRANSACTION_CACHE_TTL = 2 * 60; // 2 minutos
```

## 📊 Resultados Esperados

### **Performance**
- **80-90%** redução no tempo de queries
- **Cache hit rate** > 90%
- **Queries essenciais** < 200ms
- **Views materializadas** < 50ms

### **Escalabilidade**
- **15 queries principais** em vez de 50+
- **Cache distribuído** com Redis
- **Índices otimizados** 100% utilizados
- **Connection pool** estável

### **Manutenibilidade**
- **Código limpo** e focado
- **Documentação** completa
- **Monitoramento** em tempo real
- **Scripts** de automação

---

**✅ Foco nas queries essenciais = Performance máxima!** 🚀 