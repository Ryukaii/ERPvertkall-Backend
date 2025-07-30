# Mudanças no Campo Amount - Conversão para Centavos

## Resumo das Alterações

O campo `amount` das transações financeiras foi alterado para armazenar valores em centavos como inteiros, em vez de valores decimais em reais.

### Antes
- Tipo: `Decimal(10, 2)` 
- Exemplo: `99.99` (R$ 99,99)

### Depois
- Tipo: `Int`
- Exemplo: `9999` (R$ 99,99 em centavos)

## Arquivos Modificados

### 1. Schema do Prisma
- **Arquivo**: `prisma/schema.prisma`
- **Mudança**: Campo `amount` alterado de `Decimal @db.Decimal(10, 2)` para `Int`

### 2. Migração do Banco
- **Arquivo**: `prisma/migrations/20250723195302_change_amount_to_cents/migration.sql`
- **Ação**: Conversão automática dos dados existentes

### 3. DTOs
- **Arquivo**: `src/modules/financeiro/dto/create-financial-transaction.dto.ts`
- **Mudanças**:
  - Validação alterada para `@Min(0.01)` (mínimo de 1 centavo)
  - Adicionado decorator `@AmountToCents()` para conversão automática

### 4. Decorator Personalizado
- **Arquivo**: `src/common/decorators/amount-to-cents.decorator.ts`
- **Função**: Converte automaticamente valores de reais para centavos

### 5. Interceptor de Resposta
- **Arquivo**: `src/common/interceptors/amount-transformer.interceptor.ts`
- **Função**: Converte automaticamente valores de centavos para reais nas respostas da API

### 6. Controller
- **Arquivo**: `src/modules/financeiro/financial-transaction.controller.ts`
- **Mudança**: Adicionado interceptor `@UseInterceptors(AmountTransformerInterceptor)`

## Como Funciona

### Entrada (Request)
1. Cliente envia: `{ "amount": 99.99 }`
2. Decorator `@AmountToCents()` converte para: `9999`
3. Valor é salvo no banco como: `9999`

### Saída (Response)
1. Banco retorna: `9999`
2. Interceptor `AmountTransformerInterceptor` converte para: `99.99`
3. Cliente recebe: `{ "amount": 99.99 }`

## Vantagens

1. **Precisão**: Elimina problemas de arredondamento com números decimais
2. **Performance**: Operações com inteiros são mais rápidas
3. **Consistência**: Padrão usado por sistemas financeiros profissionais
4. **Simplicidade**: Não há necessidade de lidar com casas decimais no banco

## Compatibilidade

- ✅ Dados existentes foram convertidos automaticamente
- ✅ API mantém a mesma interface (reais na entrada/saída)
- ✅ Frontend não precisa de alterações
- ✅ Todas as funcionalidades existentes continuam funcionando

## Exemplos de Uso

### Criar Transação
```json
POST /financeiro/transactions
{
  "title": "Conta de Luz",
  "description": "Conta de luz de janeiro",
  "amount": 99.99,
  "dueDate": "2025-02-15",
  "type": "PAYABLE",
  "categoryId": "category_id"
}
```

### Resposta
```json
{
  "id": "transaction_id",
  "title": "Conta de Luz",
  "description": "Conta de luz de janeiro",
  "amount": 99.99,
  "dueDate": "2025-02-15T00:00:00.000Z",
  "type": "PAYABLE",
  "status": "PENDING"
}
```

## Notas Importantes

1. **Valor Mínimo**: O valor mínimo aceito é R$ 0,01 (1 centavo)
2. **Arredondamento**: Valores são arredondados para o centavo mais próximo
3. **Dashboard**: Todos os cálculos do dashboard continuam funcionando normalmente
4. **Recorrência**: Transações recorrentes mantêm a mesma lógica 