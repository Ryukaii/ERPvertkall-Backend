# Rotas da API - ERP Vertkall

## Autenticação

### POST /auth/register
Registra um novo usuário
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Nome do Usuário"
}
```

### POST /auth/login
Faz login do usuário
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## Usuários (Apenas Administradores)

### GET /users
Lista todos os usuários (apenas admin)

### GET /users/:id
Busca usuário específico (apenas admin)

### POST /users/:id/toggle-admin
Altera status de admin de um usuário (apenas admin)

### PUT /users/:id/permissions
Atualiza permissões de um usuário (apenas admin)
```json
{
  "moduleId": "module-id",
  "permissions": [
    {
      "resource": "transactions",
      "action": "read",
      "isActive": true
    },
    {
      "resource": "transactions",
      "action": "write",
      "isActive": false
    }
  ]
}
```

### GET /users/:id/permissions
Busca permissões de um usuário (apenas admin)

### GET /users/me/permissions
Busca minhas permissões (qualquer usuário autenticado)

## Módulo Financeiro

### Categorias

#### GET /financeiro/categories
Lista todas as categorias (requer permissão: financeiro:categories:read)

#### GET /financeiro/categories/:id
Busca categoria específica (requer permissão: financeiro:categories:read)

#### POST /financeiro/categories
Cria nova categoria (requer permissão: financeiro:categories:write)
```json
{
  "name": "Nome da Categoria",
  "description": "Descrição da categoria",
  "type": "RECEIVABLE" // ou "PAYABLE"
}
```

#### PATCH /financeiro/categories/:id
Atualiza categoria (requer permissão: financeiro:categories:write)

#### DELETE /financeiro/categories/:id
Remove categoria (requer permissão: financeiro:categories:write)

### Transações

#### GET /financeiro/transactions
Lista transações (requer permissão: financeiro:transactions:read)

#### GET /financeiro/transactions/dashboard
Resumo do dashboard (requer permissão: financeiro:transactions:read)

#### GET /financeiro/transactions/:id
Busca transação específica (requer permissão: financeiro:transactions:read)

#### POST /financeiro/transactions
Cria nova transação (requer permissão: financeiro:transactions:write)
```json
{
  "title": "Título da Transação",
  "description": "Descrição",
  "amount": 100.50,
  "dueDate": "2024-01-15T00:00:00Z",
  "type": "RECEIVABLE",
  "categoryId": "category-id",
  "paymentMethodId": "payment-method-id"
}
```

#### PATCH /financeiro/transactions/:id
Atualiza transação (requer permissão: financeiro:transactions:write)

#### PUT /financeiro/transactions/:id/mark-as-paid
Marca transação como paga (requer permissão: financeiro:transactions:write)
```json
{
  "paidDate": "2024-01-15T00:00:00Z"
}
```

#### PUT /financeiro/transactions/mark-overdue
Marca transações vencidas (requer permissão: financeiro:transactions:write)

#### DELETE /financeiro/transactions/:id
Remove transação (requer permissão: financeiro:transactions:write)

### Métodos de Pagamento

#### GET /financeiro/payment-methods
Lista métodos de pagamento (requer permissão: financeiro:payment_methods:read)

#### GET /financeiro/payment-methods/:id
Busca método de pagamento específico (requer permissão: financeiro:payment_methods:read)

#### POST /financeiro/payment-methods
Cria novo método de pagamento (requer permissão: financeiro:payment_methods:write)
```json
{
  "name": "PIX",
  "isActive": true
}
```

#### PATCH /financeiro/payment-methods/:id
Atualiza método de pagamento (requer permissão: financeiro:payment_methods:write)

#### DELETE /financeiro/payment-methods/:id
Remove método de pagamento (requer permissão: financeiro:payment_methods:write)

### Transações Recorrentes

#### GET /recurring-transactions
Lista transações recorrentes (requer permissão: financeiro:recurring_transactions:read)

#### GET /recurring-transactions/dashboard
Resumo do dashboard de recorrentes (requer permissão: financeiro:recurring_transactions:read)

#### GET /recurring-transactions/:id
Busca transação recorrente específica (requer permissão: financeiro:recurring_transactions:read)

#### POST /recurring-transactions
Cria nova transação recorrente (requer permissão: financeiro:recurring_transactions:write)
```json
{
  "title": "Título da Transação Recorrente",
  "description": "Descrição",
  "amount": 100.50,
  "type": "RECEIVABLE",
  "frequency": "MONTHLY",
  "interval": 1,
  "startDate": "2024-01-15T00:00:00Z",
  "categoryId": "category-id",
  "paymentMethodId": "payment-method-id"
}
```

#### PATCH /recurring-transactions/:id
Atualiza transação recorrente (requer permissão: financeiro:recurring_transactions:write)

#### PATCH /recurring-transactions/:id/toggle-status
Altera status da transação recorrente (requer permissão: financeiro:recurring_transactions:write)

#### POST /recurring-transactions/generate
Gera transações baseadas nas recorrentes (requer permissão: financeiro:recurring_transactions:write)

#### DELETE /recurring-transactions/:id
Remove transação recorrente (requer permissão: financeiro:recurring_transactions:write)

## Recursos e Ações

### Recursos disponíveis:
- `categories` - Categorias financeiras
- `transactions` - Transações financeiras
- `payment_methods` - Métodos de pagamento
- `recurring_transactions` - Transações recorrentes

### Ações disponíveis:
- `read` - Permissão de leitura
- `write` - Permissão de escrita (inclui criação, atualização e exclusão)

### Módulos disponíveis:
- `financeiro` - Módulo financeiro

## Usuário Administrador Padrão

Email: `admin@erpvertkall.com`
Senha: `admin123`

Este usuário tem todas as permissões por padrão. 

## Transações Bancárias

### Listar todas as transações de todos os bancos
```
GET /api/bancos/transactions
```

Por padrão, retorna apenas as transações do usuário logado.

#### Para retornar transações de todos os usuários:
```
GET /api/bancos/transactions?all=true
```

#### Parâmetros de filtro disponíveis:
- `all=true`: Retorna transações de todos os usuários (boolean)
- `type`: Tipo da transação (CREDIT, DEBIT)
- `status`: Status da transação (PENDING, CONFIRMED, CANCELLED)
- `categoryId`: ID da categoria
- `paymentMethodId`: ID do método de pagamento
- `startDate`: Data de início (formato ISO)
- `endDate`: Data de fim (formato ISO)

#### Exemplos:
```
# Todas as transações do usuário logado
GET /api/bancos/transactions

# Todas as transações de todos os usuários
GET /api/bancos/transactions?all=true

# Transações confirmadas entre duas datas
GET /api/bancos/transactions?status=CONFIRMED&startDate=2024-01-01&endDate=2024-12-31

# Todas as transações de crédito de todos os usuários
GET /api/bancos/transactions?all=true&type=CREDIT
```

### Listar transações de um banco específico
```
GET /api/bancos/{bankId}/transactions
```

Retorna apenas as transações do banco especificado. 