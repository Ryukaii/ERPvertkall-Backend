# 📊 API de Categorias Financeiras - ERP Vertkall

## 🎯 Visão Geral
O sistema de categorias financeiras permite organizar transações por tipo (receitas ou despesas) e facilita o controle e relatórios financeiros.

## 🔗 Base URL
```
http://localhost:3000/api/financeiro/categories
```

## 🔐 Autenticação
Todas as rotas requerem autenticação JWT:
```
Authorization: Bearer <jwt_token>
```

## 📋 Rotas Disponíveis

### 1. **Criar Categoria** - `POST /financeiro/categories`
Cria uma nova categoria financeira.

**Body:**
```json
{
  "name": "Alimentação",
  "description": "Gastos com alimentação e refeições",
  "type": "PAYABLE"
}
```

**Resposta:**
```json
{
  "id": "clx1234567890",
  "name": "Alimentação",
  "description": "Gastos com alimentação e refeições",
  "type": "PAYABLE",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. **Listar Categorias** - `GET /financeiro/categories`
Lista todas as categorias ou filtra por tipo.

**Query Parameters:**
- `type` (opcional): `RECEIVABLE` ou `PAYABLE`

**Exemplos:**
```
GET /financeiro/categories
GET /financeiro/categories?type=PAYABLE
GET /financeiro/categories?type=RECEIVABLE
```

**Resposta:**
```json
[
  {
    "id": "clx1234567890",
    "name": "Alimentação",
    "description": "Gastos com alimentação",
    "type": "PAYABLE",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "clx1234567891",
    "name": "Vendas",
    "description": "Receitas de vendas",
    "type": "RECEIVABLE",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### 3. **Buscar Categoria** - `GET /financeiro/categories/:id`
Busca uma categoria específica por ID.

**Resposta:**
```json
{
  "id": "clx1234567890",
  "name": "Alimentação",
  "description": "Gastos com alimentação",
  "type": "PAYABLE",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "_count": {
    "transactions": 5
  }
}
```

### 4. **Atualizar Categoria** - `PATCH /financeiro/categories/:id`
Atualiza uma categoria existente.

**Body (campos opcionais):**
```json
{
  "name": "Alimentação e Refeições",
  "description": "Gastos com alimentação, refeições e lanches",
  "type": "PAYABLE"
}
```

**Resposta:**
```json
{
  "id": "clx1234567890",
  "name": "Alimentação e Refeições",
  "description": "Gastos com alimentação, refeições e lanches",
  "type": "PAYABLE",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z"
}
```

### 5. **Excluir Categoria** - `DELETE /financeiro/categories/:id`
Exclui uma categoria (apenas se não tiver transações vinculadas).

**Resposta:**
```json
{
  "id": "clx1234567890",
  "name": "Categoria Excluída",
  "description": "Descrição da categoria",
  "type": "PAYABLE",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## 📊 Tipos de Categoria

### `RECEIVABLE` (Contas a Receber)
Categorias para receitas e entradas de dinheiro:
- Vendas
- Comissões
- Investimentos
- Empréstimos recebidos
- Outras receitas

### `PAYABLE` (Contas a Pagar)
Categorias para despesas e saídas de dinheiro:
- Alimentação
- Transporte
- Moradia
- Saúde
- Educação
- Lazer
- Serviços
- Impostos

## ⚠️ Regras de Negócio

### Validações:
1. **Nome único**: Não pode existir duas categorias com o mesmo nome
2. **Tipo obrigatório**: Deve ser `RECEIVABLE` ou `PAYABLE`
3. **Descrição opcional**: Pode ser nula ou vazia
4. **Exclusão segura**: Só permite excluir categorias sem transações vinculadas

### Erros Comuns:
```json
// Nome duplicado
{
  "statusCode": 409,
  "message": "Já existe uma categoria com este nome"
}

// Categoria não encontrada
{
  "statusCode": 404,
  "message": "Categoria não encontrada"
}

// Tentativa de excluir categoria com transações
{
  "statusCode": 409,
  "message": "Não é possível excluir categoria que possui transações vinculadas"
}
```

## 🎨 Sugestões para Frontend

### Interface Sugerida:
1. **Lista de Categorias** com filtro por tipo
2. **Formulário de Criação/Edição** com validação
3. **Modal de Confirmação** para exclusão
4. **Indicador visual** do tipo (receita/despesa)
5. **Contador de transações** por categoria

### Funcionalidades Úteis:
- **Filtro por tipo** (receitas/despesas)
- **Busca por nome**
- **Ordenação alfabética**
- **Validação em tempo real**
- **Feedback visual** de operações

## 🔗 Integração com Transações

As categorias são usadas nas transações financeiras através do campo `categoryId`:

```json
{
  "title": "Compra de alimentos",
  "description": "Compras do mês",
  "amount": 150.00,
  "dueDate": "2024-01-20",
  "type": "PAYABLE",
  "categoryId": "clx1234567890", // ID da categoria
  "paymentMethodId": "clx1234567891"
}
```

## 📈 Relatórios

As categorias permitem gerar relatórios por:
- **Tipo de transação** (receitas vs despesas)
- **Categoria específica**
- **Período de tempo**
- **Comparativo mensal/anual** 