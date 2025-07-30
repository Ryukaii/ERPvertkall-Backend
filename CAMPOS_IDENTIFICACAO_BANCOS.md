# Campos de Identificação dos Bancos

## ✅ **Novos Campos Adicionados**

### **Campos de Identificação**
- **`documentType`**: Tipo de documento (CPF ou CNPJ)
- **`document`**: Número do CPF ou CNPJ
- **`holderName`**: Nome ou Razão Social do titular

### **Enum BankDocumentType**
```typescript
enum BankDocumentType {
  CPF  // Pessoa Física
  CNPJ // Pessoa Jurídica
}
```

## 📊 **Estrutura da Tabela Banks**

```sql
CREATE TABLE banks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  accountNumber TEXT NOT NULL,
  accountType TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT true,
  
  -- Novos campos de identificação
  documentType TEXT NOT NULL,
  document TEXT NOT NULL,
  holderName TEXT NOT NULL,
  
  createdAt TIMESTAMP NOT NULL DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL DEFAULT now()
);
```

## 🎯 **Exemplos de Uso**

### **Pessoa Física (CPF)**
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

### **Pessoa Jurídica (CNPJ)**
```json
{
  "name": "Banco do Brasil",
  "accountNumber": "99887766",
  "accountType": "CHECKING",
  "balance": 750000,
  "documentType": "CNPJ",
  "document": "12.345.678/0001-90",
  "holderName": "Empresa ABC Ltda"
}
```

## 🔧 **APIs Atualizadas**

### **Novo Endpoint**
- `GET /bancos/document-types` - Listar tipos de documento disponíveis

### **Response do Endpoint**
```json
[
  { "value": "CPF", "label": "CPF (Pessoa Física)" },
  { "value": "CNPJ", "label": "CNPJ (Pessoa Jurídica)" }
]
```

## 📋 **Dados de Exemplo Criados**

### **Bancos com Identificação Completa**
1. **Nubank** - João Silva (CPF: 123.456.789-00)
2. **Itaú** - Maria Santos (CPF: 987.654.321-00)
3. **Caixa Econômica** - Pedro Oliveira (CPF: 111.222.333-44)
4. **Cartão de Crédito Nubank** - João Silva (CPF: 123.456.789-00)
5. **Banco do Brasil** - Empresa ABC Ltda (CNPJ: 12.345.678/0001-90)

## 🎉 **Vantagens**

### ✅ **Benefícios**
1. **Identificação Completa**: Cada banco tem CPF/CNPJ e nome/razão social
2. **Flexibilidade**: Suporte a pessoa física e jurídica
3. **Rastreabilidade**: Fácil identificação do titular da conta
4. **Compliance**: Atende requisitos de identificação bancária
5. **Organização**: Melhor estruturação dos dados

### 🔍 **Casos de Uso**
- **Contas Pessoais**: CPF + Nome do titular
- **Contas Empresariais**: CNPJ + Razão Social
- **Contas Conjuntas**: CPF + Nome dos titulares
- **Contas de Investimento**: CPF/CNPJ + Nome/Razão Social

## 🚀 **Como Usar**

### **1. Criar Banco com Identificação**
```bash
curl -X POST "http://localhost:3000/bancos" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nubank",
    "accountNumber": "12345678",
    "accountType": "CHECKING",
    "documentType": "CPF",
    "document": "123.456.789-00",
    "holderName": "João Silva"
  }'
```

### **2. Listar Tipos de Documento**
```bash
curl -X GET "http://localhost:3000/bancos/document-types" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **3. Buscar Banco com Identificação**
```bash
curl -X GET "http://localhost:3000/bancos/BANK_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "id": "bank_id",
  "name": "Nubank",
  "accountNumber": "12345678",
  "accountType": "CHECKING",
  "balance": 100000,
  "documentType": "CPF",
  "document": "123.456.789-00",
  "holderName": "João Silva",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

## ✅ **Status da Implementação**

- ✅ Schema atualizado com novos campos
- ✅ Migração aplicada com sucesso
- ✅ DTOs atualizados com validação
- ✅ Service atualizado com novos métodos
- ✅ Controller com novo endpoint
- ✅ Seed atualizado com dados de exemplo
- ✅ Documentação completa
- ✅ Build funcionando corretamente

**Os bancos agora têm identificação completa com CPF/CNPJ e nome/razão social!** 🎉 