# Dashboard API - Novas Rotas

Este documento descreve as novas rotas criadas para o dashboard e funcionalidades de transações.

## 📊 Dashboard Summary

### Endpoint: `GET /api/dashboard/summary`

Obter resumo completo do dashboard com métricas, gráficos e transações relevantes.

#### Parâmetros Query (opcionais)
```typescript
{
  bankId?: string;     // ID do banco específico
  startDate?: string;  // Data inicial (YYYY-MM-DD)
  endDate?: string;    // Data final (YYYY-MM-DD)
}
```

#### Resposta
```typescript
{
  // Métricas principais
  totalReceivable: number;    // Total de receitas
  totalPayable: number;       // Total de despesas  
  totalPending: number;       // Total pendente
  totalOverdue: number;       // Total vencido
  
  // Dados para gráficos (últimos 12 meses ou período especificado)
  monthlyData: [
    {
      month: "2024-01",         // Formato YYYY-MM
      receivable: number;       // Receitas do mês
      payable: number;          // Despesas do mês
      previstoRecebido: number; // Previsto para receber
      previstoPago: number;     // Previsto para pagar
      recebidoConfirmado: number; // Recebido confirmado
      pagoConfirmado: number;   // Pago confirmado
    }
  ],
  
  // Transações para hoje (máximo 10)
  todayTransactions: [
    {
      id: string;
      title: string;
      amount: number;
      type: "CREDIT" | "DEBIT";
      transactionDate: string;
      category?: {
        id: string;
        name: string;
      };
    }
  ],
  
  // Transações vencidas (máximo 10)
  overdueTransactions: [
    {
      id: string;
      title: string;
      amount: number;
      transactionDate: string;
      category?: {
        id: string;
        name: string;
      };
    }
  ]
}
```

#### Exemplo de uso
```bash
# Dashboard geral dos últimos 12 meses
GET /api/dashboard/summary

# Dashboard de um banco específico em 2024
GET /api/dashboard/summary?bankId=bank_123&startDate=2024-01-01&endDate=2024-12-31

# Dashboard dos últimos 30 dias
GET /api/dashboard/summary?startDate=2024-11-01&endDate=2024-11-30
```

---

## 💰 Transactions Summary

### Endpoint: `GET /api/bancos/transactions/summary`

Obter resumo de transações com filtros avançados e paginação.

#### Parâmetros Query (opcionais)
```typescript
{
  bankId?: string;               // ID do banco ou "all" para todos
  type?: "RECEIVABLE" | "PAYABLE" | "CREDIT" | "DEBIT" | "TRANSFER";
  status?: "PENDING" | "PAID" | "OVERDUE" | "CONFIRMED" | "CANCELLED";
  categoryId?: string;           // ID da categoria
  startDate?: string;            // Data inicial (YYYY-MM-DD)
  endDate?: string;              // Data final (YYYY-MM-DD)
  search?: string;               // Busca por título/descrição
  page?: number;                 // Página (padrão: 1)
  limit?: number;                // Itens por página (padrão: 20, máx: 100)
}
```

#### Resposta
```typescript
{
  // Resumo das transações filtradas
  summary: {
    totalTransactions: number;  // Total de transações
    totalCredits: number;       // Total de créditos
    totalDebits: number;        // Total de débitos
    periodBalance: number;      // Saldo do período (créditos - débitos)
  },
  
  // Transações com paginação
  transactions: [
    {
      id: string;
      title: string;
      description?: string;
      amount: number;
      type: "CREDIT" | "DEBIT" | "TRANSFER";
      transactionDate: string;
      status: "PENDING" | "CONFIRMED" | "CANCELLED";
      category?: {
        id: string;
        name: string;
      };
      bank?: {
        id: string;
        name: string;
        accountNumber: string;
        accountType: string;
      };
      // Para transferências
      transferFromBank?: {
        id: string;
        name: string;
      };
      transferToBank?: {
        id: string;
        name: string;
      };
    }
  ],
  
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

#### Exemplos de uso
```bash
# Apenas créditos pendentes de um banco específico
GET /api/bancos/transactions/summary?bankId=bank_123&type=CREDIT&status=PENDING

# Buscar transações por termo
GET /api/bancos/transactions/summary?search=pagamento&page=1&limit=20

# Transações de uma categoria em um período
GET /api/bancos/transactions/summary?categoryId=cat_456&startDate=2024-01-01&endDate=2024-01-31
```

---

## 🏦 Banks with Balance

### Endpoint: `GET /api/bancos/with-balance`

Obter lista de bancos com saldos calculados em tempo real.

#### Resposta
```typescript
{
  banks: [
    {
      id: string;
      name: string;
      accountNumber: string;
      accountType: string;
      holderName: string;
      document: string;
      isActive: boolean;
      initialBalance: number;      // Saldo inicial configurado
      realBalance: number;         // Saldo calculado com transações
      transactionBalance: number;  // Saldo apenas das transações
    }
  ]
}
```

#### Exemplo de uso
```bash
GET /api/bancos/with-balance
```

---

## 🔐 Permissões Necessárias

### Dashboard
- **Módulo**: `financeiro`
- **Recurso**: `financial_transactions`
- **Ação**: `read`

### Transactions Summary
- **Módulo**: `bancos`
- **Recurso**: `bank_transactions`
- **Ação**: `read`

### Banks with Balance
- **Módulo**: `bancos`
- **Recurso**: `banks`
- **Ação**: `read`

---

## 📝 Notas Técnicas

### Lógica de Cálculo

1. **Dashboard Summary**:
   - Totaliza receitas e despesas baseado no tipo de transação
   - Agrupa dados mensalmente para gráficos
   - Filtra transações de hoje usando `transactionDate` ou `dueDate`
   - Identifica vencidas comparando `dueDate` com data atual

2. **Transactions Summary**:
   - Aplica filtros combinados (banco, tipo, status, categoria, período, busca)
   - Calcula resumo dos valores nas transações filtradas
   - Implementa paginação otimizada

3. **Banks with Balance**:
   - `initialBalance`: Saldo inicial do banco
   - `transactionBalance`: Soma de todas as transações confirmadas (CREDIT - DEBIT + transferências)
   - `realBalance`: `initialBalance + transactionBalance`
   - Considera transferências entre bancos corretamente

### Performance

- Consultas otimizadas com índices existentes no banco
- Uso de `aggregate` para cálculos de soma
- Paginação para evitar sobrecarga
- Consultas paralelas com `Promise.all`

### Estrutura Unificada

As rotas utilizam a tabela unificada `FinancialTransaction` que combina:
- Transações financeiras (contas a pagar/receber)
- Transações bancárias (créditos/débitos)
- Transferências entre contas

Isso garante consistência e simplicidade no desenvolvimento frontend.