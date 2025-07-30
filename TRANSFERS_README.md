# Sistema de Transferências Entre Contas

## 📋 Resumo da Implementação

Implementamos um sistema completo de transferências entre contas cadastradas no sistema, onde cada transferência cria duas transações vinculadas:

- **Transação de Débito**: Na conta de origem (valor negativo)
- **Transação de Crédito**: Na conta de destino (valor positivo)

Ambas as transações são vinculadas através do campo `linkedTransactionId`, garantindo a rastreabilidade completa da transferência.

## 🔧 Mudanças Técnicas

### 1. **Schema do Banco de Dados**

Adicionamos os seguintes campos à tabela `financial_transactions`:

- `transferFromBankId` (String?): ID da conta de origem
- `transferToBankId` (String?): ID da conta de destino  
- `linkedTransactionId` (String?): ID da transação vinculada

Adicionamos um novo tipo ao enum `FinancialTransactionType`:
- `TRANSFER`: Transferência entre contas

### 2. **Novos Relacionamentos no Prisma**

```prisma
// Relacionamentos para transferências
transferFromBank Bank? @relation("TransferFromBank", fields: [transferFromBankId], references: [id])
transferToBank   Bank? @relation("TransferToBank", fields: [transferToBankId], references: [id])
linkedTransaction FinancialTransaction? @relation("LinkedTransactions", fields: [linkedTransactionId], references: [id])
linkedTransactions FinancialTransaction[] @relation("LinkedTransactions")
```

### 3. **Novos Arquivos Criados**

- `src/modules/bancos/dto/create-transfer.dto.ts`: DTO para validação de transferências
- `src/modules/bancos/transfer.controller.ts`: Controller específico para transferências
- `TRANSFERS_README.md`: Esta documentação

### 4. **Arquivos Modificados**

- `prisma/schema.prisma`: Adicionados campos e relacionamentos para transferências
- `src/modules/bancos/bank-transaction.service.ts`: Adicionado método `createTransfer()`
- `src/modules/bancos/bancos.module.ts`: Registrado novo controller

## 🚀 Como Usar

### **1. Criar Transferência**

```http
POST /bancos/transfers
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Transferência para conta poupança",
  "description": "Transferência mensal",
  "amount": 50000,
  "fromBankId": "conta-corrente-id",
  "toBankId": "conta-poupanca-id",
  "transactionDate": "2024-01-15T10:00:00Z",
  "categoryId": "categoria-id",
  "paymentMethodId": "metodo-id",
  "tagIds": ["tag1-id", "tag2-id"]
}
```

### **2. Buscar Transferência**

```http
GET /bancos/transfers/:id
Authorization: Bearer <token>
```

### **3. Atualizar Transferência**

```http
PATCH /bancos/transfers/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Transferência atualizada",
  "description": "Nova descrição",
  "amount": 75000,
  "transactionDate": "2024-01-20T10:00:00Z",
  "categoryId": "nova-categoria-id",
  "tagIds": ["nova-tag-id"]
}
```

### **4. Excluir Transferência**

```http
DELETE /bancos/transfers/:id
Authorization: Bearer <token>
```

### **5. Converter Transação em Transferência**

```http
POST /bancos/transactions/convert-to-transfer
Content-Type: application/json
Authorization: Bearer <token>

{
  "transactionId": "transacao-original-id",
  "fromBankId": "conta-origem-id",
  "toBankId": "conta-destino-id",
  "title": "Transferência convertida",
  "description": "Convertida de transação normal",
  "amount": 50000,
  "tagIds": ["tag1-id", "tag2-id"]
}
```

### **Campos Obrigatórios**

- `title`: Título da transferência
- `amount`: Valor em centavos (R$ 500,00 = 50000)
- `fromBankId`: ID da conta de origem
- `toBankId`: ID da conta de destino

### **Campos Opcionais**

- `description`: Descrição da transferência
- `transactionDate`: Data da transferência (padrão: agora)
- `categoryId`: Categoria financeira
- `paymentMethodId`: Método de pagamento
- `tagIds`: Lista de IDs de tags

### **Campos para Conversão de Transação**

- `transactionId`: ID da transação original a ser convertida
- `fromBankId`: ID da conta de origem (deve ser a conta da transação original)
- `toBankId`: ID da conta de destino
- `title`, `description`, `amount`, `tagIds`: Opcionais (se não informados, usa os da transação original)

### **Resposta da API**

```json
{
  "message": "Transferência realizada com sucesso",
  "transfer": {
    "id": "linked-transaction-id",
    "amount": 50000,
    "fromBank": {
      "id": "conta-corrente-id",
      "name": "Conta Corrente Nubank",
      "accountNumber": "12345-6"
    },
    "toBank": {
      "id": "conta-poupanca-id", 
      "name": "Poupança Caixa",
      "accountNumber": "98765-4"
    },
    "transactionDate": "2024-01-15T10:00:00.000Z",
    "debitTransaction": { /* transação completa de débito */ },
    "creditTransaction": { /* transação completa de crédito */ }
  }
}
```

## ✅ **Validações Implementadas**

### **Para Transferências**
1. **Contas Diferentes**: Origem e destino devem ser diferentes
2. **Contas Existentes**: Ambas as contas devem existir no sistema
3. **Contas Ativas**: Ambas as contas devem estar ativas
4. **Saldo Suficiente**: Conta de origem deve ter saldo suficiente
5. **Tags Válidas**: Se fornecidas, todas as tags devem existir e estar ativas
6. **Valores Positivos**: O valor da transferência deve ser maior que zero

### **Para Conversão de Transações**
1. **Transação Existente**: A transação original deve existir
2. **Não é Transferência**: A transação não deve ser já uma transferência
3. **Conta Correta**: A transação original deve pertencer à conta de origem
4. **Contas Válidas**: Ambas as contas devem existir e estar ativas
5. **Saldo Suficiente**: Conta de origem deve ter saldo suficiente
6. **Valor Válido**: Se informado novo valor, deve ser positivo

## 🔒 **Garantias de Consistência**

- **Transação Atômica**: Utiliza `$transaction` do Prisma para garantir que ambas as transações sejam criadas ou nenhuma seja criada
- **Vinculação Bidirecional**: Ambas as transações apontam uma para a outra através do `linkedTransactionId`
- **Status Automático**: Transferências são automaticamente marcadas como `CONFIRMED`
- **Cálculo de Saldo**: O sistema verifica o saldo atual antes de permitir a transferência

## 📊 **Como Consultar Transferências**

As transferências podem ser consultadas através dos endpoints existentes de transações bancárias:

```http
GET /bancos/{bankId}/transactions?type=TRANSFER
```

Para identificar transferências:
- Transações com `type = TRANSFER` 
- Transações que possuem `linkedTransactionId` preenchido
- Transações que possuem `transferFromBankId` e `transferToBankId` preenchidos

## 🔍 **Exemplo de Fluxo Completo**

1. **Usuário faz uma transferência de R$ 500,00 da Conta A para Conta B**

2. **Sistema cria duas transações:**
   - **Transação 1** (Débito): `-50000` centavos na Conta A
   - **Transação 2** (Crédito): `+50000` centavos na Conta B

3. **Ambas as transações são vinculadas:**
   - Transação 1 tem `linkedTransactionId` = ID da Transação 2
   - Transação 2 tem `linkedTransactionId` = ID da Transação 1

4. **Ambas têm os campos de transferência preenchidos:**
   - `transferFromBankId` = ID da Conta A
   - `transferToBankId` = ID da Conta B

5. **Resultado:** Histórico completo e rastreabilidade total da transferência

## 🎯 **Benefícios da Implementação**

- ✅ **Rastreabilidade completa** entre as transações
- ✅ **Consistência de dados** garantida por transações atômicas
- ✅ **Validações robustas** antes da execução
- ✅ **Compatibilidade** com sistema existente de tags e categorias
- ✅ **Flexibilidade** para consultas e relatórios
- ✅ **Auditoria** completa de todas as operações
- ✅ **CRUD completo** para gerenciar transferências
- ✅ **Conversão de transações** em transferências
- ✅ **Validações específicas** para cada operação

## 📁 **Arquivos Criados/Modificados**

**Novos arquivos:**
- `src/modules/bancos/dto/create-transfer.dto.ts`
- `src/modules/bancos/dto/update-transfer.dto.ts`
- `src/modules/bancos/dto/convert-to-transfer.dto.ts`
- `src/modules/bancos/transfer.controller.ts`
- `src/modules/bancos/convert-transaction.controller.ts`
- `TRANSFERS_README.md`

**Modificados:**
- `prisma/schema.prisma` - Adicionado tipo TRANSFER e campos de linking
- `src/modules/bancos/bank-transaction.service.ts` - Métodos CRUD completos para transferências
- `src/modules/bancos/bancos.module.ts` - Registrados novos controllers
- Migração aplicada: `20250730154934_add_transfer_support`

## 🔗 **Endpoints Disponíveis**

### **Transferências**
- `POST /bancos/transfers` - Criar transferência
- `GET /bancos/transfers/:id` - Buscar transferência
- `PATCH /bancos/transfers/:id` - Atualizar transferência
- `DELETE /bancos/transfers/:id` - Excluir transferência

### **Conversão de Transações**
- `POST /bancos/transactions/convert-to-transfer` - Converter transação em transferência