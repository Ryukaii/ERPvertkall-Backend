# 🏷️ Sistema de Tags - Documentação Completa

## 📋 Visão Geral

O sistema de tags permite categorizar e organizar transações financeiras e bancárias de forma flexível. As tags podem ser aplicadas tanto em transações normais quanto durante a revisão de importações OFX.

## 🏗️ Arquitetura

### Modelo de Dados
```sql
-- Tabela principal de tags
tags {
  id: string (cuid)
  name: string (unique)
  color: string? (hexadecimal)
  description: string?
  isActive: boolean (default: true)
  createdAt: DateTime
  updatedAt: DateTime
}

-- Relacionamento: Transações Financeiras ↔ Tags
financial_transaction_tags {
  id: string (cuid)
  financialTransactionId: string
  tagId: string
  createdAt: DateTime
}

-- Relacionamento: Transações OFX Pendentes ↔ Tags
ofx_pending_transaction_tags {
  id: string (cuid)
  ofxPendingTransactionId: string
  tagId: string
  createdAt: DateTime
}
```

## 🚀 APIs Disponíveis

### 1. Gerenciamento de Tags

#### **GET /tags** - Listar Tags
```bash
# Listar todas as tags
GET /tags

# Com filtros
GET /tags?name=Alimentação&isActive=true&page=1&limit=10
```

**Parâmetros de Query:**
- `name` (string, opcional): Filtrar por nome
- `isActive` (boolean, opcional): Filtrar por status ativo
- `page` (number, opcional): Página (padrão: 1)
- `limit` (number, opcional): Itens por página (padrão: 10)

**Resposta:**
```json
{
  "data": [
    {
      "id": "tag_123",
      "name": "Alimentação",
      "color": "#FF5733",
      "description": "Despesas com alimentação",
      "isActive": true,
      "createdAt": "2024-01-30T10:00:00Z",
      "updatedAt": "2024-01-30T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### **POST /tags** - Criar Tag
```bash
POST /tags
Content-Type: application/json

{
  "name": "Alimentação",
  "color": "#FF5733",
  "description": "Despesas com alimentação",
  "isActive": true
}
```

**Campos:**
- `name` (string, obrigatório): Nome da tag (único)
- `color` (string, opcional): Cor em hexadecimal (#RRGGBB)
- `description` (string, opcional): Descrição da tag
- `isActive` (boolean, opcional): Status ativo (padrão: true)

#### **GET /tags/:id** - Buscar Tag Específica
```bash
GET /tags/tag_123
```

**Resposta:**
```json
{
  "id": "tag_123",
  "name": "Alimentação",
  "color": "#FF5733",
  "description": "Despesas com alimentação",
  "isActive": true,
  "createdAt": "2024-01-30T10:00:00Z",
  "updatedAt": "2024-01-30T10:00:00Z",
  "_count": {
    "financialTransactions": 5,
    "ofxPendingTransactions": 2
  }
}
```

#### **PATCH /tags/:id** - Atualizar Tag
```bash
PATCH /tags/tag_123
Content-Type: application/json

{
  "name": "Alimentação e Bebidas",
  "color": "#FF8C42"
}
```

#### **PATCH /tags/:id/toggle-active** - Ativar/Desativar Tag
```bash
PATCH /tags/tag_123/toggle-active
```

#### **DELETE /tags/:id** - Excluir Tag
```bash
DELETE /tags/tag_123
```

**Nota:** Só permite exclusão se a tag não estiver sendo usada em nenhuma transação.

#### **GET /tags/most-used** - Tags Mais Usadas
```bash
GET /tags/most-used?limit=10
```

**Resposta:**
```json
[
  {
    "id": "tag_123",
    "name": "Alimentação",
    "color": "#FF5733",
    "isActive": true,
    "totalUsages": 15
  }
]
```

### 2. Tags em Transações Bancárias

#### **POST /bancos/:bankId/transactions** - Criar Transação com Tags
```bash
POST /bancos/bank_123/transactions
Content-Type: application/json

{
  "title": "Almoço no restaurante",
  "description": "Almoço executivo",
  "amount": 4500,
  "transactionDate": "2024-01-30T12:00:00Z",
  "type": "DEBIT",
  "categoryId": "cat_123",
  "paymentMethodId": "pm_123",
  "tagIds": ["tag_123", "tag_456"]
}
```

#### **PATCH /bancos/:bankId/transactions/:id** - Atualizar Transação com Tags
```bash
PATCH /bancos/bank_123/transactions/txn_123
Content-Type: application/json

{
  "title": "Almoço atualizado",
  "tagIds": ["tag_123", "tag_789"]
}
```

### 3. Tags em Transações Financeiras

#### **POST /financial-transactions** - Criar Transação com Tags
```bash
POST /financial-transactions
Content-Type: application/json

{
  "title": "Pagamento de aluguel",
  "description": "Aluguel do apartamento",
  "amount": 1500.00,
  "dueDate": "2024-02-05T00:00:00Z",
  "type": "PAYABLE",
  "categoryId": "cat_456",
  "paymentMethodId": "pm_789",
  "tagIds": ["tag_123", "tag_456"]
}
```

#### **PATCH /financial-transactions/:id** - Atualizar Transação com Tags
```bash
PATCH /financial-transactions/txn_123
Content-Type: application/json

{
  "title": "Aluguel atualizado",
  "tagIds": ["tag_123"]
}
```

### 4. Tags na Revisão de OFX

#### **PATCH /ofx-pending-transactions/:id/tags** - Atualizar Tags de Transação OFX
```bash
PATCH /ofx-pending-transactions/ofx_123/tags
Content-Type: application/json

{
  "tagIds": ["tag_123", "tag_456"]
}
```

**Resposta:**
```json
{
  "id": "ofx_123",
  "title": "Compra no supermercado",
  "amount": 12500,
  "type": "DEBIT",
  "transactionDate": "2024-01-30T10:00:00Z",
  "suggestedCategory": {
    "id": "cat_123",
    "name": "Alimentação"
  },
  "finalCategory": {
    "id": "cat_123",
    "name": "Alimentação"
  },
  "tags": [
    {
      "tag": {
        "id": "tag_123",
        "name": "Alimentação",
        "color": "#FF5733"
      }
    },
    {
      "tag": {
        "id": "tag_456",
        "name": "Supermercado",
        "color": "#4CAF50"
      }
    }
  ]
}
```

## 🔧 Exemplos de Uso

### 1. Criar Tags Comuns
```bash
# Tag para alimentação
curl -X POST "http://localhost:3000/tags" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alimentação",
    "color": "#FF5733",
    "description": "Despesas com alimentação"
  }'

# Tag para transporte
curl -X POST "http://localhost:3000/tags" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Transporte",
    "color": "#4CAF50",
    "description": "Despesas com transporte"
  }'

# Tag para lazer
curl -X POST "http://localhost:3000/tags" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lazer",
    "color": "#9C27B0",
    "description": "Despesas com entretenimento"
  }'
```

### 2. Criar Transação Bancária com Tags
```bash
curl -X POST "http://localhost:3000/bancos/bank_123/transactions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Almoço no restaurante",
    "description": "Almoço executivo",
    "amount": 4500,
    "transactionDate": "2024-01-30T12:00:00Z",
    "type": "DEBIT",
    "tagIds": ["tag_alimentacao", "tag_restaurante"]
  }'
```

### 3. Adicionar Tags na Revisão OFX
```bash
curl -X PATCH "http://localhost:3000/ofx-pending-transactions/ofx_123/tags" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tagIds": ["tag_alimentacao", "tag_supermercado"]
  }'
```

### 4. Buscar Transações por Tags
```bash
# Listar transações com tags
curl -X GET "http://localhost:3000/bancos/bank_123/transactions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Casos de Uso

### 1. Categorização Flexível
- Use tags para categorizar transações de forma mais granular
- Exemplo: Uma transação pode ter categoria "Alimentação" e tags "Restaurante", "Almoço", "Executivo"

### 2. Filtros Avançados
- Combine categorias e tags para filtros mais precisos
- Exemplo: Todas as transações de "Alimentação" com tag "Restaurante"

### 3. Relatórios Personalizados
- Use tags para criar relatórios específicos
- Exemplo: Despesas com "Lazer" em "Restaurantes"

### 4. Revisão de OFX
- Adicione tags durante a revisão de importações OFX
- Melhore a organização das transações importadas

## ⚠️ Validações e Regras

### Tags
- **Nome único**: Não podem existir duas tags com o mesmo nome
- **Soft delete**: Tags são desativadas, não excluídas
- **Validação de uso**: Não é possível excluir tags em uso
- **Cores**: Formato hexadecimal (#RRGGBB)

### Transações
- **Tags válidas**: Apenas tags existentes e ativas podem ser associadas
- **Múltiplas tags**: Uma transação pode ter várias tags
- **Herança**: Tags são mantidas ao aprovar transações OFX

## 🔍 Filtros e Busca

### Por Tag
```bash
# Buscar transações com tag específica
GET /bancos/bank_123/transactions?tagId=tag_123
```

### Tags Mais Usadas
```bash
# Ver tags mais populares
GET /tags/most-used?limit=5
```

## 📊 Integração com Sistema Existente

### Transações Bancárias
- Tags são incluídas automaticamente nas respostas
- Validação de tags no momento da criação/atualização
- Herança de tags ao aprovar transações OFX

### Transações Financeiras
- Mesma funcionalidade das transações bancárias
- Compatibilidade total com sistema existente

### OFX Pending Transactions
- Tags podem ser adicionadas durante a revisão
- Tags são transferidas para transações finais ao aprovar

## 🚀 Próximos Passos

1. **Filtros por tags**: Implementar filtros avançados por tags
2. **Relatórios**: Criar relatórios baseados em tags
3. **Sugestão automática**: IA sugere tags baseada no conteúdo
4. **Tags hierárquicas**: Sistema de tags pai/filho
5. **Importação em lote**: Adicionar tags em múltiplas transações

## 📝 Notas Técnicas

- **Performance**: Índices otimizados para consultas por tags
- **Escalabilidade**: Sistema preparado para milhares de tags
- **Consistência**: Validações em tempo real
- **Segurança**: Apenas usuários autenticados podem gerenciar tags
- **Auditoria**: Logs de criação/atualização de tags

---

**Sistema de Tags** - Versão 1.0  
*Implementado com sucesso e pronto para uso em produção! 🎉* 