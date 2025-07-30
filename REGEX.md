# 🔍 API de Categorização Automática por Regex - ERP Vertkall

## 🎯 Visão Geral
O sistema de categorização automática utiliza regras regex para analisar transações bancárias importadas via OFX e sugerir automaticamente as categorias mais apropriadas, melhorando significativamente a experiência do usuário.

## 🔗 Base URL
```
http://localhost:3000/api/ai/ai-categorization
```

## 🔐 Autenticação
Todas as rotas requerem autenticação JWT:
```
Authorization: Bearer <jwt_token>
```

## ⚙️ Configuração

### Funcionalidades
- ✅ **Categorização Automática**: Durante importação OFX
- ✅ **Sugestões Individuais**: Para transações específicas
- ✅ **Sugestões em Lote**: Para múltiplas transações
- ✅ **Categorização Manual**: Aplicar categorias manualmente
- ✅ **Transações Pendentes**: Listar transações sem categoria

## 📋 Rotas Disponíveis

### 1. **Listar Transações Pendentes** - `GET /ai-categorization/pending`
Lista todas as transações importadas do OFX que ainda não possuem categoria.

**Resposta:**
```json
[
  {
    "id": "clx1234567890",
    "title": "PAGAMENTO CARTÃO CREDITO",
    "description": "Compra no estabelecimento",
    "amount": -15000,
    "type": "PAYABLE",
    "transactionDate": "2024-01-15T10:30:00.000Z",
    "QI: null,
    "bank": {
      "id": "clx1234567891",
      "name": "Banco do Brasil"
    }
  }
]
```

### 2. **Sugerir Categoria Individual** - `POST /ai-categorization/suggest/:transactionId`
Obtém sugestão de categoria por regex para uma transação específica.

**Resposta:**
```json
{
  "transactionId": "clx1234567890",
  "suggestion": {
    "categoryId": "clx1234567892",
    "categoryName": "Folha",
    "confidence": 100,
    "reasoning": "Identificado como VT/VR (Vale Transporte/Refeição) por regex"
  },
  "transaction": {
    "id": "clx1234567890",
    "title": "PAGAMENTO VT DA SEMANA",
    "description": "Vale transporte funcionário",
    "amount": -5000,
    "type": "PAYABLE",
    "transactionDate": "2024-01-15T10:30:00.000Z"
  },
  "autoApplied": false,
  "message": "Sugestão por regex: Folha (100% confiança)"
}
```

### 3. **Aplicar Categorização Manual** - `POST /ai-categorization/categorize/:transactionId`
Aplica uma categoria manualmente a uma transação.

**Body:**
```json
{
  "categoryId": "clx1234567892",
  "confidence": 100,
  "reasoning": "Categorização manual"
}
```

**Resposta:**
```json
{
  "message": "Transo categorizada com sucesso",
  "transactionId": "clx1234567890",
  "categoryId": "clx1234567892",
  "categoryName": "Folha"
}
```

### 4. **Sugestões em Lote** - `POST /ai-categorization/batch-suggest`
Gera sugestões de categoria por regex para múltiplas transações pendentes (máximo 10 por vez).

** **Resposta:**
```json
{
  "message": "Sugestões por regex geradas para 5 transações",
  "suggestions": [
    {
      "transactionId": "clx1234567890",
      "transactionTitle": "PAGAMENTO VT DA SEMANA",
      "suggestion": {
        "categoryId": "clx1234567892",
        "categoryName": "Folha",
        "confidence": 100,
        "reasoning": "Identificado como VT/VR (Vale Transporte/Refeição) por regex"
      }
    }
  ]
}
```

## 🔍 Regras Regex Implementadas

### **Folha (Despesas)**
- **Padrão**: `/\b(VT|VR)\b/i`
- **Exemplos**: "Pagamento VT da Semana", "Pagamento VR", "VT KAROLYNA"
- **Confiança**: 100%
- **Padrão**: `/\b(PREMIACAO|premiacao)\b/i`
- **Exemplos**: "Pagamento Premiacao", "premiacao funcionário"
- **Confiança**: 100%
- **Padrão**: `/\b(LEADS|leads)\b/i`
- **Exemplos**: "Pagamento Leads", "leads funcionário"
- **Confiança**: 100%

### **Impostos (Despesas)**
- **Padrão**: `/\b(IOF)\b/i`
- **Exemplos**: "IOF sobre operação", "Imposto IOF"
- **Confiança**: 100%

### **Aporte Financeiro**
- **Padrão**: `/\b(LUIS\s+FELIPE\s+LEITE\s+BARBOZA)\b/i`
- **Exemplos**: "LUIS FELIPE LEITE BARBOZA"
- **Confiança**: 100%

### **PARTICULAR (Receitas)**
- **Padrão**: `/\b(RECEBIMENTO\s+PIX\s+[A-Z\s]+\s+\*\*\*\.\d+\.\d+-\*\*)\b/i`
- **Exemplos**: "Recebimento Pix SONIA RENATA OSTI LOZANO ***.378.877-**"
- **Confiança**: 100%

### **Associações**
- **Associação Medicas**: `/\b(ACB|ASSOCIAÇÃO\s+ACB|ACB\s+ASSOC)\b/i`
- **Associação Medicas**: `/\b(AMAI|AMAI\s+ASSOC|ASSOCIAÇÃO\s+AMAI)\b/i`
- **Associação Medicas**: `/\b(AMHP|AMHP\s+ASSOC|ASSOCIAÇÃO\s+AMHP)\b/i`
- **Associação Medicas**: `/\b(ASMEPRO|ASMEPRO\s+ASSOC|ASSOCIAÇÃO\s+ASMEPRO)\b/i`
- **Associação Medicas**: `/\b(ASSOCIACAO\s+MEDICA\s+DO\s+CORPO\s+CLIN\s+DO)\b/i`
- **PARTICULAR**: `/\b(PARTICULAR|PART|PARTIC)\b/i`

### **Vendas (Receitas)**
- **Padrão**: `/\b(VENDA|VENDAS|VEND|VEND\s+PROD|PRODUTO|SERVIÇO|SERVICO)\b/i`
- **Confiança**: 100%

### **Juros e Rendimentos (Receitas)**
- **Padrão**: `/\b(JUROS|RENDIMENTO|RENDIMENTOS|JURO|REND|INVESTIMENTO|INVEST)\b/i`
- **Confiança**: 100%

### **Prestação de Serviço (Despesas)**
- **Padrão**: `/\b(PRESTADOR|prestador)\b/i`
- **Exemplos**: "Pagamento prestador", "PRESTADOR SERVIÇO"
- **Confiança**: 100%

### **Outras Receitas**
- **Padrão**: `/\b(OUTRAS\s+RECEITAS|OUTRA\s+RECEITA|RECEITA\s+DIVERSAS|RECEITA\s+EXTRA)\b/i`
- **Confiança**: 100%

## 🚀 Como Usar

### 1. **Importar OFX**
```bash
POST /api/ai/ofx-import
Content-Type: multipart/form-data

file: arquivo.ofx
```

### 2. **Verificar Transações Pendentes**
```bash
GET /api/ai/ai-categorization/pending
Authorization: Bearer <jwt_token>
```

### 3. **Sugerir Categoria**
```bash
POST /api/ai/ai-categorization/suggest/:transactionId
Authorization: Bearer <jwt_token>
```

### 4. **Aplicar Categoria**
```bash
POST /api/ai/ai-categorization/categorize/:transactionId
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "categoryId": "clx1234567892",
  "confidence": 100,
  "reasoning": "Categorização manual"
}
```

## 📊 Logs e Debug

O sistema gera logs detalhados durante a categorização:

```
🔍 Analisando regex para: "PAGAMENTO VT DA SEMANA Vale transporte funcionário"
✅ Regex match encontrado: "/\b(VT|VR)\b/i" -> Folha
🎯 Categoria encontrada: Folha (ID: clx1234567892)
🎯 Categorização por regex aplicada: "PAGAMENTO VT DA SEMANA" -> Folha (100%)
📝 Motivo: Identificado como VT/VR (Vale Transporte/Refeição) por regex
```

## ✅ Status: **IMPLEMENTADO E FUNCIONANDO**

A categorização automática por regex está **100% implementada** e pronta para uso, oferecendo categorização rápida e precisa baseada em regras predefinidas. 