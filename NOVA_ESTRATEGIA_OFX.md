# Nova Estratégia OFX - Implementação Completa

## Visão Geral

Implementei a nova estratégia para importação de OFX com aprovação de categorizações:

1. **OFX é importado** → começa análise
2. **Envia dados para ChatGPT** → analizar (resposta com confiança e categoria)
3. **Guarda confiança e categoria** → junto do schema da transação na tabela `ofx_pending_transactions`
4. **Revisar categorias sugeridas** → através de novas rotas REST
5. **Autorizar e criar transações** → quando satisfeito com as alterações

## Mudanças Implementadas

### 1. Nova Tabela no Banco de Dados
- **`ofx_pending_transactions`**: Armazena transações OFX temporárias com categorizações sugeridas
- **Status `PENDING_REVIEW`**: Adicionado ao enum `OfxImportStatus`

### 2. Fluxo Modificado
- OFX não cria `FinancialTransaction` imediatamente
- Cria registros em `OfxPendingTransaction` com sugestões de categoria
- Status do import fica `PENDING_REVIEW` até aprovação

### 3. ChatGPT Simplificado
- Removida a "Explicação" do prompt de resposta
- Resposta mais concisa com apenas categoria e confiança

## Rotas Disponíveis

### Importação OFX (Existente)
```http
POST /ofx-import/upload
```
- Agora retorna status `PENDING_REVIEW` ao invés de criar transações diretamente

### Gerenciamento de Transações Pendentes

#### 1. Visualizar Transações Pendentes de um Import
```http
GET /ofx-pending-transactions/import/{importId}
```
**Resposta:**
```json
{
  "id": "import-id",
  "status": "PENDING_REVIEW",
  "bank": { "name": "Banco X" },
  "pendingTransactions": [
    {
      "id": "pending-id",
      "title": "Pagamento VT KAROLYNA",
      "amount": 5000,
      "type": "DEBIT",
      "suggestedCategory": {
        "name": "Folha",
        "id": "category-id"
      },
      "confidence": 85,
      "finalCategory": null
    }
  ]
}
```

#### 2. Obter Resumo do Import
```http
GET /ofx-pending-transactions/import/{importId}/summary
```
**Resposta:**
```json
{
  "summary": {
    "totalTransactions": 50,
    "withFinalCategory": 10,
    "withSuggestedCategory": 45,
    "highConfidenceSuggestions": 40,
    "uncategorized": 5,
    "readyToApprove": false
  }
}
```

#### 3. Atualizar Categoria de uma Transação
```http
PUT /ofx-pending-transactions/{transactionId}/category
Content-Type: application/json

{
  "categoryId": "nova-categoria-id"
}
```

#### 4. Sugerir Nova Categoria (Re-analisar com ChatGPT)
```http
POST /ofx-pending-transactions/{transactionId}/suggest-category
```

#### 5. Atualização em Lote
```http
PUT /ofx-pending-transactions/batch-update-categories
Content-Type: application/json

{
  "transactions": [
    { "id": "pending-id-1", "categoryId": "categoria-1" },
    { "id": "pending-id-2", "categoryId": "categoria-2" }
  ]
}
```

#### 6. Aprovar e Criar Transações Finais
```http
POST /ofx-pending-transactions/import/{importId}/approve
```
**Resultado:**
- Converte todas as transações pendentes em `FinancialTransaction`
- Remove registros de `OfxPendingTransaction`
- Atualiza status do import para `COMPLETED`
- Usa categoria final se definida, senão usa sugerida se confiança >= 70%

## Critérios de Categorização Automática

### Durante Import:
- ChatGPT analisa cada transação
- Salva sugestão e confiança na tabela pendente
- **Não aplica automaticamente** (diferente do comportamento anterior)

### Durante Aprovação:
- Usa `finalCategoryId` se definida manualmente
- Senão, usa `suggestedCategoryId` se confiança >= 70%
- Transações sem categoria ficam sem categoria

## Exemplo de Fluxo Completo

### 1. Import OFX
```bash
curl -X POST /ofx-import/upload \
  -F "file=@extrato.ofx" \
  -F "bankId=banco-id"
```

### 2. Verificar Transações Pendentes
```bash
curl /ofx-pending-transactions/import/{importId}
```

### 3. Ajustar Categorizações (se necessário)
```bash
curl -X PUT /ofx-pending-transactions/{transactionId}/category \
  -H "Content-Type: application/json" \
  -d '{"categoryId": "nova-categoria"}'
```

### 4. Aprovar Import
```bash
curl -X POST /ofx-pending-transactions/import/{importId}/approve
```

## Status do Sistema

✅ **Implementado:**
- Nova tabela `OfxPendingTransaction`
- Modificação do fluxo de import
- Controller e service para gerenciamento pendente
- Rota de aprovação
- ChatGPT sem "Explicação"
- Compilação sem erros

🎯 **Pronto para Teste:**
- Todas as rotas estão funcionais
- Banco de dados atualizado
- Tipos TypeScript corretos 