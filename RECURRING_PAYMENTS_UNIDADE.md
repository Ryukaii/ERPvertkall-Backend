# Pagamentos Recorrentes com Unidade Opcional

## Visão Geral

A funcionalidade de pagamentos recorrentes agora suporta a associação opcional com uma unidade do sistema. Isso permite categorizar pagamentos recorrentes por unidade específica.

## Mudanças Implementadas

### 1. Schema do Banco de Dados

- Adicionado campo `unidadeId` opcional na tabela `recurring_payments`
- Criada relação com a tabela `unidades`
- Migration aplicada: `20250724213403_add_unidade_to_recurring_payments`

### 2. DTOs Atualizados

#### CreateRecurringPaymentDto
```typescript
export class CreateRecurringPaymentDto {
  title: string;
  recurrenceType: RecurrenceType;
  weekday?: number;        // Para recorrência semanal
  day?: number;           // Para recorrência mensal/anual
  month?: number;         // Para recorrência anual
  paymentMethodId?: string;
  unidadeId?: string;     // NOVO: ID da unidade (opcional)
}
```

#### UpdateRecurringPaymentDto
- Herda de `CreateRecurringPaymentDto` com `PartialType`
- Inclui automaticamente o campo `unidadeId` opcional

### 3. Service Atualizado

O `RecurringPaymentService` agora inclui a unidade nos relacionamentos:

```typescript
// Criação
await this.prisma.recurringPayment.create({ 
  data: dto, 
  include: { 
    paymentMethod: true,
    unidade: true  // Inclui dados da unidade
  } 
});

// Listagem
await this.prisma.recurringPayment.findMany({ 
  include: { 
    paymentMethod: true,
    unidade: true  // Inclui dados da unidade
  } 
});
```

## Como Usar

### 1. Criar Pagamento Recorrente com Unidade

```bash
POST /financeiro/recurring-payments
Content-Type: application/json

{
  "title": "Aluguel Loja Centro",
  "recurrenceType": "MONTHLY",
  "day": 5,
  "paymentMethodId": "payment_method_id",
  "unidadeId": "unidade_id"  // Opcional
}
```

### 2. Criar Pagamento Recorrente sem Unidade

```bash
POST /financeiro/recurring-payments
Content-Type: application/json

{
  "title": "Assinatura Netflix",
  "recurrenceType": "MONTHLY",
  "day": 15,
  "paymentMethodId": "payment_method_id"
  // unidadeId não informado
}
```

### 3. Buscar Pagamento Recorrente por ID

```bash
GET /financeiro/recurring-payments/:id
```

### 4. Atualizar Pagamento Recorrente

```bash
PATCH /financeiro/recurring-payments/:id
Content-Type: application/json

{
  "title": "Aluguel Loja Centro - Atualizado",
  "day": 10,
  "unidadeId": "nova_unidade_id"
}
```

### 5. Excluir Pagamento Recorrente

```bash
DELETE /financeiro/recurring-payments/:id
```

### 6. Listar Pagamentos Recorrentes

```bash
GET /financeiro/recurring-payments
```

Resposta incluirá dados da unidade (se associada):

```json
[
  {
    "id": "recurring_payment_id",
    "title": "Aluguel Loja Centro",
    "recurrenceType": "MONTHLY",
    "day": 5,
    "paymentMethodId": "payment_method_id",
    "unidadeId": "unidade_id",
    "paymentMethod": {
      "id": "payment_method_id",
      "name": "PIX"
    },
    "unidade": {
      "id": "unidade_id",
      "nome": "Loja Centro",
      "local": "Centro da Cidade"
    },
    "createdAt": "2025-07-24T18:34:00.000Z",
    "updatedAt": "2025-07-24T18:34:00.000Z"
  }
]
```

## Endpoints Disponíveis

### Pagamentos Recorrentes

- `POST /financeiro/recurring-payments` - Criar pagamento recorrente
- `GET /financeiro/recurring-payments` - Listar pagamentos recorrentes
- `GET /financeiro/recurring-payments/:id` - Buscar pagamento recorrente por ID
- `PATCH /financeiro/recurring-payments/:id` - Atualizar pagamento recorrente
- `DELETE /financeiro/recurring-payments/:id` - Excluir pagamento recorrente

### Unidades

Para obter a lista de unidades disponíveis:

```bash
GET /unidades
```

## Permissões Necessárias

Cada endpoint requer permissões específicas:

- **Criar**: `financeiro` módulo, `recurring_payments` recurso, `write` ação
- **Listar/Buscar**: `financeiro` módulo, `recurring_payments` recurso, `read` ação
- **Atualizar**: `financeiro` módulo, `recurring_payments` recurso, `write` ação
- **Excluir**: `financeiro` módulo, `recurring_payments` recurso, `delete` ação

## Validações

- `unidadeId` é opcional
- Se fornecido, deve ser um ID válido de uma unidade existente
- A validação é feita automaticamente pelo Prisma através da foreign key
- Tentativas de acessar, atualizar ou excluir registros inexistentes retornam erro 404

## Benefícios

1. **Organização**: Permite categorizar pagamentos recorrentes por unidade
2. **Relatórios**: Facilita a geração de relatórios por unidade
3. **Flexibilidade**: Mantém compatibilidade com pagamentos sem unidade
4. **Rastreabilidade**: Permite identificar facilmente a qual unidade pertence cada pagamento recorrente 