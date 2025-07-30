# Sugestão de Método de Pagamento - OFX Import

## Visão Geral

A funcionalidade de sugestão de método de pagamento foi implementada para analisar automaticamente as transações OFX importadas e sugerir o método de pagamento mais apropriado baseado em regras regex.

## Funcionalidades Implementadas

### 1. Novos Campos na Tabela OfxPendingTransaction

- `suggestedPaymentMethodId`: ID do método de pagamento sugerido
- `suggestedPaymentMethodName`: Nome do método de pagamento sugerido
- `paymentMethodConfidence`: Confiança da sugestão (0-100%)
- `finalPaymentMethodId`: ID do método de pagamento final (manual)

### 2. Serviço de Sugestão

**Arquivo**: `src/modules/bancos/payment-method-suggestion.service.ts`

O serviço analisa o título e descrição da transação usando regras regex para sugerir o método de pagamento mais apropriado.

### 3. Regras Regex Implementadas

| Padrão | Método de Pagamento | Confiança | Motivo |
|--------|-------------------|-----------|---------|
| `PIX\|PIX RECEBIMENTO\|PIX PAGAMENTO` | PIX | 100% | Transações PIX |
| `BOLETO\|BOLETO BANCARIO` | Boleto Bancário | 100% | Boletos bancários |
| `CARTAO CREDITO\|CREDITO` | Cartão de Crédito | 100% | Cartão de crédito |
| `CARTAO DEBITO\|DEBITO` | Cartão de Débito | 100% | Cartão de débito |
| `CHEQUE` | Cheque | 100% | Cheques |
| `DEBITO AUTOMATICO` | Débito Automático | 100% | Débito automático |
| `DINHEIRO\|CASH` | Dinheiro | 100% | Dinheiro |
| `TRANSFERENCIA\|TED\|DOC` | Transferência Bancária | 100% | Transferências |
| `SAQUE\|ATM` | Dinheiro | 90% | Saques ATM |
| `POS` | Cartão de Débito | 85% | Compras POS |
| `DEPOSITO` | Transferência Bancária | 80% | Depósitos |

### 4. Controller para API

**Arquivo**: `src/modules/bancos/payment-method-suggestion.controller.ts`

Endpoints disponíveis:
- `POST /payment-method-suggestion/suggest` - Sugerir método para dados específicos
- `POST /payment-method-suggestion/ofx-transaction/:id/suggest` - Sugerir método para transação OFX específica

## Integração com Importação OFX

### Processo Automático

Durante a importação de arquivos OFX, o sistema agora:

1. **Cria a transação pendente** com os dados do OFX
2. **Sugere categoria** usando o serviço de categorização existente
3. **Sugere método de pagamento** usando o novo serviço
4. **Salva ambas as sugestões** na transação pendente

### Logs de Debug

O sistema gera logs detalhados durante o processo:

```
💳 === DEBUG OFX - INICIANDO SUGESTÃO DE MÉTODO DE PAGAMENTO ===
📊 Transação pendente: cmdnjq92s000n0in9gzs3sxgp
📝 Dados para sugestão de método de pagamento:
   Título: "PIX RECEBIMENTO"
   Descrição: "Transferência PIX recebida"
   Valor: 5000 centavos
   Tipo: CREDIT

💳 Resultado da sugestão de método de pagamento:
   ✅ Sugestão recebida:
      Método: PIX
      Confiança: 100%
   💾 Sugestão salva na transação pendente
💳 === FIM DEBUG OFX SUGESTÃO DE MÉTODO DE PAGAMENTO ===
```

## Exemplo de Uso

### 1. Importação Automática

Quando um arquivo OFX é importado, o sistema automaticamente:

```typescript
// No ofx-import.service.ts
const paymentMethodSuggestion = await this.paymentMethodSuggestionService.suggestPaymentMethodForTransaction(
  title,
  fixedName || fixedMemo || '',
  amountInCents,
  type,
);

if (paymentMethodSuggestion) {
  await this.paymentMethodSuggestionService.updateOfxPendingTransactionPaymentMethod(
    pendingTransaction.id,
    paymentMethodSuggestion.paymentMethodId,
    paymentMethodSuggestion.confidence,
  );
}
```

### 2. API Manual

```bash
# Sugerir método para dados específicos
curl -X POST http://localhost:3000/payment-method-suggestion/suggest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "transactionTitle": "PIX RECEBIMENTO",
    "transactionDescription": "Transferência PIX recebida",
    "amount": 5000,
    "type": "CREDIT"
  }'

# Resposta esperada:
{
  "success": true,
  "suggestion": {
    "paymentMethodId": "cmdg3ndve000h0i3lasdzhxu9",
    "paymentMethodName": "PIX",
    "confidence": 100,
    "reasoning": "Identificado como transação PIX por regex"
  }
}
```

## Métodos de Pagamento Disponíveis

O sistema trabalha com os seguintes métodos de pagamento:

1. **PIX** - Transferências PIX
2. **Boleto Bancário** - Boletos bancários
3. **Cartão de Crédito** - Compras no crédito
4. **Cartão de Débito** - Compras no débito
5. **Cheque** - Cheques
6. **Débito Automático** - Débitos automáticos
7. **Dinheiro** - Transações em dinheiro
8. **Transferência Bancária** - TED/DOC

## Próximos Passos

1. **Interface do Frontend**: Criar interface para visualizar e editar sugestões
2. **Aprovação em Lote**: Permitir aprovar múltiplas sugestões de uma vez
3. **Regras Customizáveis**: Permitir que usuários criem suas próprias regras regex
4. **Machine Learning**: Implementar ML para melhorar a precisão das sugestões

## Arquivos Modificados

- `prisma/schema.prisma` - Adicionados campos e relacionamentos
- `src/modules/bancos/payment-method-suggestion.service.ts` - Novo serviço
- `src/modules/bancos/payment-method-suggestion.controller.ts` - Novo controller
- `src/modules/bancos/ofx-import.service.ts` - Integração com sugestão
- `src/modules/bancos/bancos.module.ts` - Registro do novo serviço
- `prisma/migrations/20250730152244_add_payment_method_suggestion_fields/` - Migração do banco 