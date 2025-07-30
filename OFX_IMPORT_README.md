# Importação de Arquivos OFX

Este módulo permite importar arquivos OFX (Open Financial Exchange) para o sistema, processando automaticamente as transações bancárias e criando registros no banco de dados.

## Funcionalidades

- ✅ Upload de arquivos OFX
- ✅ Processamento automático de transações
- ✅ Rastreamento de importações
- ✅ Exclusão em cascata (ao excluir uma importação, todas as transações relacionadas são removidas)
- ✅ Verificação de duplicatas
- ✅ Mapeamento inteligente de tipos de transação
- ✅ Conversão automática de valores para centavos

## Estrutura do Banco de Dados

### Tabela `ofx_imports`
- `id`: Identificador único da importação
- `fileName`: Nome do arquivo OFX importado
- `importDate`: Data e hora da importação
- `bankId`: Referência ao banco relacionado
- `status`: Status da importação (PROCESSING, COMPLETED, FAILED, CANCELLED)
- `totalTransactions`: Total de transações no arquivo
- `processedTransactions`: Número de transações processadas com sucesso
- `errorMessage`: Mensagem de erro (se houver)

### Relacionamento com Transações
A tabela `financial_transactions` agora possui um campo `ofxImportId` que referencia a importação OFX. Quando uma importação é excluída, todas as transações relacionadas são automaticamente removidas (CASCADE).

## Endpoints da API

### POST `/ofx-import/upload`
Importa um arquivo OFX.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body (form-data):**
- `file`: Arquivo OFX (.ofx)
- `bankId`: ID do banco relacionado
- `description` (opcional): Descrição da importação

**Resposta:**
```json
{
  "message": "Arquivo OFX importado com sucesso",
  "importId": "clx1234567890",
  "status": "COMPLETED",
  "totalTransactions": 150,
  "processedTransactions": 150
}
```

### GET `/ofx-import`
Lista todas as importações OFX.

**Resposta:**
```json
[
  {
    "id": "clx1234567890",
    "fileName": "extrato_banco.ofx",
    "importDate": "2025-07-24T16:30:00.000Z",
    "bankId": "clx0987654321",
    "status": "COMPLETED",
    "totalTransactions": 150,
    "processedTransactions": 150,
    "bank": {
      "id": "clx0987654321",
      "name": "Banco do Brasil",
      "accountNumber": "12345-6"
    },
    "transactions": [...]
  }
]
```

### GET `/ofx-import/:id`
Obtém detalhes de uma importação específica.

### GET `/ofx-import/:id/status`
Obtém o status e progresso de uma importação.

**Resposta:**
```json
{
  "status": "COMPLETED",
  "progress": 100
}
```

### DELETE `/ofx-import/:id`
Exclui uma importação e todas as transações relacionadas.

## Processamento de Transações

### Tipos de Transação Mapeados
O sistema mapeia automaticamente os tipos OFX para títulos legíveis:

- `CREDIT` → "Depósito"
- `DEBIT` → "Saque"
- `INT` → "Juros"
- `DIV` → "Dividendos"
- `FEE` → "Taxa"
- `SRVCHG` → "Taxa de Serviço"
- `DEP` → "Depósito"
- `ATM` → "Saque ATM"
- `POS` → "Compra POS"
- `XFER` → "Transferência"
- `CHECK` → "Cheque"
- `PAYMENT` → "Pagamento"
- `CASH` → "Dinheiro"
- `DIRECTDEP` → "Depósito Direto"
- `DIRECTDEBIT` → "Débito Direto"
- `REPEATPMT` → "Pagamento Recorrente"
- `HOLD` → "Retenção"
- `OTHER` → "Outro"

### Conversão de Valores
- Valores são automaticamente convertidos para centavos
- Exemplo: R$ 99,99 → 9999 centavos

### Verificação de Duplicatas
O sistema verifica automaticamente se uma transação já existe baseado em:
- `ofxImportId`
- `title`
- `amount`
- `transactionDate`

## Exemplo de Uso

### Frontend (JavaScript)
```javascript
const formData = new FormData();
formData.append('file', ofxFile);
formData.append('bankId', 'clx0987654321');
formData.append('description', 'Extrato de janeiro');

const response = await fetch('/ofx-import/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### cURL
```bash
curl -X POST http://localhost:3000/ofx-import/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@extrato.ofx" \
  -F "bankId=clx0987654321" \
  -F "description=Extrato de janeiro"
```

## Tratamento de Erros

O sistema trata os seguintes erros:

- **Arquivo não fornecido**: "Arquivo OFX é obrigatório"
- **Formato inválido**: "Arquivo deve ter extensão .ofx"
- **Banco não encontrado**: "Banco não encontrado"
- **Formato OFX inválido**: "Formato OFX inválido"
- **Nenhuma transação**: "Nenhuma transação encontrada no arquivo OFX"

## Status de Importação

- `PROCESSING`: Arquivo sendo processado
- `COMPLETED`: Processamento concluído com sucesso
- `FAILED`: Erro durante o processamento
- `CANCELLED`: Importação cancelada

## Segurança

- Todas as rotas requerem autenticação JWT
- Validação de tipos de arquivo
- Verificação de permissões de usuário
- Sanitização de dados de entrada 