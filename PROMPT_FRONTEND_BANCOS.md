# 🏦 Sistema de Bancos - Prompt para Frontend

## 📋 **Informações Gerais**

Implementamos um sistema completo de bancos com as seguintes características:

- **Bancos são globais do sistema** (não atrelados a usuários)
- **Transações são por usuário** (cada usuário tem suas próprias transações nos bancos)
- **Tabela unificada**: Transações bancárias e financeiras na mesma tabela
- **Identificação completa**: CPF/CNPJ + Nome/Razão Social para cada banco

## 🔗 **APIs Disponíveis**

### **Bancos (Globais)**
```
POST /bancos - Criar banco
GET /bancos - Listar bancos
GET /bancos/:id - Buscar banco específico
GET /bancos/:id/balance - Saldo do banco
PATCH /bancos/:id - Atualizar banco
DELETE /bancos/:id - Desativar banco
GET /bancos/account-types - Tipos de conta
GET /bancos/document-types - Tipos de documento
```

### **Transações (Por Usuário)**
```
POST /bancos/:bankId/transactions - Criar transação
GET /bancos/:bankId/transactions - Listar transações
GET /bancos/:bankId/transactions/:id - Buscar transação
PATCH /bancos/:bankId/transactions/:id - Atualizar transação
DELETE /bancos/:bankId/transactions/:id - Excluir transação
PATCH /bancos/:bankId/transactions/:id/status - Atualizar status
GET /bancos/:bankId/transactions/summary - Resumo financeiro
```

## 📊 **Estrutura de Dados**

### **Banco (Response)**
```typescript
interface Bank {
  id: string;
  name: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT';
  balance: number; // Em centavos
  isActive: boolean;
  documentType: 'CPF' | 'CNPJ';
  document: string;
  holderName: string;
  createdAt: string;
  updatedAt: string;
}
```

### **Transação (Response)**
```typescript
interface BankTransaction {
  id: string;
  title: string;
  description?: string;
  amount: number; // Em centavos (positivo=crédito, negativo=débito)
  transactionDate: string;
  type: 'CREDIT' | 'DEBIT';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  bankId: string;
  categoryId?: string;
  paymentMethodId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  
  // Relacionamentos incluídos
  bank: Bank;
  category?: FinancialCategory;
  paymentMethod?: PaymentMethod;
}
```

### **Resumo Financeiro (Response)**
```typescript
interface TransactionSummary {
  totalCredits: number;   // Em centavos
  totalDebits: number;    // Em centavos
  netAmount: number;      // Em centavos
  transactionCount: number;
}
```

## 🎯 **Exemplos de Uso**

### **1. Criar Banco**
```typescript
const newBank = await api.post('/bancos', {
  name: 'Nubank',
  accountNumber: '12345678',
  accountType: 'CHECKING',
  balance: 100000, // R$ 1.000,00
  documentType: 'CPF',
  document: '123.456.789-00',
  holderName: 'João Silva'
});
```

### **2. Listar Bancos**
```typescript
const banks = await api.get('/bancos');
// Retorna array de bancos globais
```

### **3. Criar Transação**
```typescript
const newTransaction = await api.post(`/bancos/${bankId}/transactions`, {
  title: 'Salário',
  description: 'Salário do mês',
  amount: 500000, // R$ 5.000,00
  transactionDate: '2024-01-15T10:00:00Z',
  type: 'CREDIT',
  categoryId: 'category_id',
  paymentMethodId: 'payment_method_id'
});
```

### **4. Listar Transações de um Banco**
```typescript
const transactions = await api.get(`/bancos/${bankId}/transactions`, {
  params: {
    type: 'CREDIT',
    status: 'CONFIRMED',
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
});
```

### **5. Obter Resumo Financeiro**
```typescript
const summary = await api.get(`/bancos/${bankId}/transactions/summary`, {
  params: {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
});
```

## 🎨 **Sugestões de Interface**

### **Tela de Bancos**
- Lista de bancos globais disponíveis
- Card para cada banco com: nome, tipo, titular, saldo
- Botão para criar novo banco (apenas admin)
- Botão para acessar transações de cada banco

### **Tela de Transações**
- Lista de transações do usuário no banco selecionado
- Filtros: tipo, status, categoria, período
- Formulário para criar nova transação
- Resumo financeiro no topo

### **Formulário de Transação**
```typescript
interface TransactionForm {
  title: string;
  description?: string;
  amount: number;
  transactionDate: string;
  type: 'CREDIT' | 'DEBIT';
  categoryId?: string;
  paymentMethodId?: string;
}
```

### **Formulário de Banco**
```typescript
interface BankForm {
  name: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT';
  balance: number;
  documentType: 'CPF' | 'CNPJ';
  document: string;
  holderName: string;
}
```

## 🔧 **Enums Disponíveis**

### **Tipos de Conta**
```typescript
const accountTypes = [
  { value: 'CHECKING', label: 'Conta Corrente' },
  { value: 'SAVINGS', label: 'Conta Poupança' },
  { value: 'INVESTMENT', label: 'Conta de Investimento' },
  { value: 'CREDIT', label: 'Cartão de Crédito' }
];
```

### **Tipos de Documento**
```typescript
const documentTypes = [
  { value: 'CPF', label: 'CPF (Pessoa Física)' },
  { value: 'CNPJ', label: 'CNPJ (Pessoa Jurídica)' }
];
```

### **Tipos de Transação**
```typescript
const transactionTypes = [
  { value: 'CREDIT', label: 'Crédito (Entrada)' },
  { value: 'DEBIT', label: 'Débito (Saída)' }
];
```

### **Status de Transação**
```typescript
const transactionStatuses = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'CANCELLED', label: 'Cancelado' }
];
```

## 💡 **Funcionalidades Especiais**

### **Cálculo de Saldo**
- Saldo é calculado dinamicamente baseado nas transações confirmadas
- Endpoint: `GET /bancos/:id/balance`

### **Filtros Avançados**
- Por tipo de transação (CREDIT/DEBIT)
- Por status (PENDING/CONFIRMED/CANCELLED)
- Por categoria
- Por método de pagamento
- Por período (startDate/endDate)

### **Resumos Financeiros**
- Total de créditos
- Total de débitos
- Saldo líquido
- Quantidade de transações

## 🚨 **Pontos Importantes**

1. **Valores em Centavos**: Todos os valores monetários são em centavos
2. **Autenticação**: Todas as rotas requerem JWT token
3. **Validação de Propriedade**: Usuários só veem suas próprias transações
4. **Bancos Globais**: Qualquer usuário pode usar qualquer banco
5. **Transações por Usuário**: Cada usuário tem suas transações independentes

## 📝 **Exemplo de Implementação**

```typescript
// Hook para gerenciar bancos
const useBanks = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  
  const fetchBanks = async () => {
    const response = await api.get('/bancos');
    setBanks(response.data);
  };
  
  const createBank = async (bankData: BankForm) => {
    const response = await api.post('/bancos', bankData);
    setBanks(prev => [...prev, response.data]);
  };
  
  return { banks, fetchBanks, createBank };
};

// Hook para gerenciar transações
const useBankTransactions = (bankId: string) => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  
  const fetchTransactions = async (filters?: any) => {
    const response = await api.get(`/bancos/${bankId}/transactions`, { params: filters });
    setTransactions(response.data);
  };
  
  const createTransaction = async (transactionData: TransactionForm) => {
    const response = await api.post(`/bancos/${bankId}/transactions`, transactionData);
    setTransactions(prev => [response.data, ...prev]);
  };
  
  return { transactions, fetchTransactions, createTransaction };
};
```

**O sistema está 100% funcional e pronto para integração com o frontend!** 🎉 