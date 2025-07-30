# API de Bancos

Este módulo permite gerenciar contas bancárias globais do sistema e suas transações, compartilhando categorias e métodos de pagamento com o módulo financeiro.

## Estrutura

- **Bancos**: Contas bancárias globais do sistema (não atreladas a usuários)
- **Transações Bancárias**: Movimentações dentro de cada conta (atreladas a usuários)
- **Categorias**: Compartilhadas com o módulo financeiro
- **Métodos de Pagamento**: Compartilhados com o módulo financeiro

## Rotas de Bancos (Globais)

### POST /bancos
Criar uma nova conta bancária global

**Body:**
```json
{
  "name": "Nubank",
  "accountNumber": "12345678",
  "accountType": "CHECKING",
  "balance": 100000,
  "documentType": "CPF",
  "document": "123.456.789-00",
  "holderName": "João Silva"
}
```

**Tipos de conta:**
- `CHECKING` - Conta Corrente
- `SAVINGS` - Conta Poupança
- `INVESTMENT` - Conta de Investimento
- `CREDIT` - Cartão de Crédito

**Tipos de documento:**
- `CPF` - Pessoa Física
- `CNPJ` - Pessoa Jurídica

### GET /bancos
Listar todas as contas bancárias globais do sistema

### GET /bancos/account-types
Listar tipos de conta disponíveis

### GET /bancos/document-types
Listar tipos de documento disponíveis

### GET /bancos/:id
Buscar uma conta bancária específica

### GET /bancos/:id/balance
Obter saldo atual da conta (calculado com base nas transações)

### PATCH /bancos/:id
Atualizar uma conta bancária

### DELETE /bancos/:id
Desativar uma conta bancária (soft delete)

## Rotas de Transações Bancárias (Por Usuário)

### POST /bancos/:bankId/transactions
Criar uma nova transação bancária para o usuário logado

**Body:**
```json
{
  "title": "Depósito",
  "description": "Depósito inicial",
  "amount": 100000,
  "transactionDate": "2024-01-15T10:00:00Z",
  "type": "CREDIT",
  "categoryId": "category_id",
  "paymentMethodId": "payment_method_id"
}
```

**Tipos de transação:**
- `CREDIT` - Crédito (entrada)
- `DEBIT` - Débito (saída)

**Status:**
- `PENDING` - Pendente
- `CONFIRMED` - Confirmado
- `CANCELLED` - Cancelado

### GET /bancos/:bankId/transactions
Listar transações do usuário logado em uma conta específica

**Query Parameters:**
- `type` - Filtrar por tipo (CREDIT/DEBIT)
- `status` - Filtrar por status
- `categoryId` - Filtrar por categoria
- `paymentMethodId` - Filtrar por método de pagamento
- `startDate` - Data inicial (ISO)
- `endDate` - Data final (ISO)

### GET /bancos/:bankId/transactions/summary
Obter resumo das transações do usuário logado

**Query Parameters:**
- `startDate` - Data inicial (ISO)
- `endDate` - Data final (ISO)

**Response:**
```json
{
  "totalCredits": 500000,
  "totalDebits": 200000,
  "netAmount": 300000,
  "transactionCount": 10
}
```

### GET /bancos/:bankId/transactions/:id
Buscar uma transação específica do usuário logado

### PATCH /bancos/:bankId/transactions/:id
Atualizar uma transação do usuário logado

### PATCH /bancos/:bankId/transactions/:id/status
Atualizar status de uma transação do usuário logado

**Body:**
```json
{
  "status": "CONFIRMED"
}
```

### DELETE /bancos/:bankId/transactions/:id
Excluir uma transação do usuário logado

## 🆕 **Nova Rota: Todas as Transações**

### GET /bancos/transactions
Listar **todas as transações** do usuário logado em **todos os bancos**

**Query Parameters:**
- `type` - Filtrar por tipo (CREDIT/DEBIT)
- `status` - Filtrar por status
- `categoryId` - Filtrar por categoria
- `paymentMethodId` - Filtrar por método de pagamento
- `startDate` - Data inicial (ISO)
- `endDate` - Data final (ISO)

**Response:**
```json
[
  {
    "id": "transaction_id_1",
    "title": "Salário",
    "description": "Salário do mês",
    "amount": 500000,
    "transactionDate": "2024-01-15T10:00:00Z",
    "type": "CREDIT",
    "status": "CONFIRMED",
    "bankId": "bank_id_1",
    "categoryId": "category_id",
    "paymentMethodId": "payment_method_id",
    "userId": "user_id",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "bank": {
      "id": "bank_id_1",
      "name": "Nubank",
      "accountNumber": "12345678",
      "accountType": "CHECKING",
      "balance": 100000,
      "documentType": "CPF",
      "document": "123.456.789-00",
      "holderName": "João Silva"
    },
    "category": {
      "id": "category_id",
      "name": "Salário",
      "type": "RECEIVABLE"
    },
    "paymentMethod": {
      "id": "payment_method_id",
      "name": "PIX"
    }
  },
  {
    "id": "transaction_id_2",
    "title": "Compras",
    "description": "Compras do mês",
    "amount": 150000,
    "transactionDate": "2024-01-16T14:30:00Z",
    "type": "DEBIT",
    "status": "CONFIRMED",
    "bankId": "bank_id_2",
    "categoryId": "category_id_2",
    "paymentMethodId": "payment_method_id_2",
    "userId": "user_id",
    "createdAt": "2024-01-16T14:30:00Z",
    "updatedAt": "2024-01-16T14:30:00Z",
    "bank": {
      "id": "bank_id_2",
      "name": "Itaú",
      "accountNumber": "87654321",
      "accountType": "CHECKING",
      "balance": 750000,
      "documentType": "CPF",
      "document": "987.654.321-00",
      "holderName": "Maria Santos"
    },
    "category": {
      "id": "category_id_2",
      "name": "Alimentação",
      "type": "PAYABLE"
    },
    "paymentMethod": {
      "id": "payment_method_id_2",
      "name": "Cartão de Crédito"
    }
  }
]
```

**Exemplo de uso:**
```bash
# Buscar todas as transações
curl -X GET "http://localhost:3000/bancos/transactions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Buscar apenas créditos confirmados
curl -X GET "http://localhost:3000/bancos/transactions?type=CREDIT&status=CONFIRMED" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Buscar transações de um período específico
curl -X GET "http://localhost:3000/bancos/transactions?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Compartilhamento de Recursos

### Categorias
As transações bancárias podem usar as mesmas categorias do módulo financeiro:
- `GET /financial-categories` - Listar categorias disponíveis

### Métodos de Pagamento
As transações bancárias podem usar os mesmos métodos de pagamento do módulo financeiro:
- `GET /payment-methods` - Listar métodos de pagamento disponíveis

## Características Especiais

1. **Bancos Globais**: Contas bancárias são do sistema, não atreladas a usuários
2. **Transações por Usuário**: Cada usuário tem suas próprias transações nos bancos
3. **Identificação Completa**: CPF/CNPJ e nome/razão social para cada banco
4. **Saldo em Centavos**: Todos os valores são armazenados em centavos para precisão
5. **Soft Delete**: Bancos são desativados, não excluídos
6. **Cálculo de Saldo**: O saldo é calculado dinamicamente baseado nas transações confirmadas
7. **Filtros Avançados**: Transações podem ser filtradas por múltiplos critérios
8. **Resumos**: Endpoints para obter resumos financeiros por período
9. **Validação de Propriedade**: Usuários só podem acessar suas próprias transações
10. **🆕 Nova Funcionalidade**: Rota para buscar todas as transações de todos os bancos de uma vez

## Arquitetura

```
Sistema
├── Bancos (Globais)
│   ├── Nubank - João Silva (CPF: 123.456.789-00)
│   ├── Itaú - Maria Santos (CPF: 987.654.321-00)
│   ├── Caixa Econômica - Pedro Oliveira (CPF: 111.222.333-44)
│   ├── Cartão de Crédito Nubank - João Silva (CPF: 123.456.789-00)
│   └── Banco do Brasil - Empresa ABC Ltda (CNPJ: 12.345.678/0001-90)
└── Transações (Por Usuário)
    ├── Usuário A → Transações no Nubank
    ├── Usuário B → Transações no Itaú
    └── Usuário C → Transações no Nubank
```

## Exemplo de Uso

1. **Administrador cria bancos globais**:
   ```bash
   POST /bancos
   {
     "name": "Nubank",
     "accountNumber": "12345678",
     "accountType": "CHECKING",
     "documentType": "CPF",
     "document": "123.456.789-00",
     "holderName": "João Silva"
   }
   ```

2. **Usuário cria transação em um banco**:
   ```bash
   POST /bancos/BANK_ID/transactions
   {
     "title": "Salário",
     "amount": 500000,
     "transactionDate": "2024-01-15T10:00:00Z",
     "type": "CREDIT"
   }
   ```

3. **Usuário consulta suas transações em um banco específico**:
   ```bash
   GET /bancos/BANK_ID/transactions
   ```

4. **🆕 Usuário consulta todas as suas transações em todos os bancos**:
   ```bash
   GET /bancos/transactions
   ```

## Campos de Identificação

### Pessoa Física (CPF)
```json
{
  "documentType": "CPF",
  "document": "123.456.789-00",
  "holderName": "João Silva"
}
```

### Pessoa Jurídica (CNPJ)
```json
{
  "documentType": "CNPJ",
  "document": "12.345.678/0001-90",
  "holderName": "Empresa ABC Ltda"
}
``` 