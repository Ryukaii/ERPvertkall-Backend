# 🤖 API de Categorização Automática com ChatGPT - ERP Vertkall

## 🎯 Visão Geral
O sistema de categorização automática utiliza ChatGPT para analisar transações bancárias importadas via OFX e sugerir automaticamente as categorias mais apropriadas, melhorando significativamente a experiência do usuário.

## 🔗 Base URL
```
http://localhost:3000/api/ai-categorization
```

## 🔐 Autenticação
Todas as rotas requerem autenticação JWT:
```
Authorization: Bearer <jwt_token>
```

## ⚙️ Configuração

### Variável de Ambiente
```bash
OPENAI_API_KEY=sua_chave_api_openai_aqui
```

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
    "category": null,
    "bank": {
      "id": "clx1234567891",
      "name": "Banco do Brasil"
    }
  }
]
```

### 2. **Sugerir Categoria Individual** - `POST /ai-categorization/suggest/:transactionId`
Obtém sugestão de categoria do ChatGPT para uma transação específica.

**Resposta:**
```json
{
  "transactionId": "clx1234567890",
  "suggestion": {
    "categoryId": "clx1234567892",
    "categoryName": "Alimentação",
    "confidence": 85,
    "reasoning": "A transação parece ser uma compra em estabelecimento alimentício baseado no valor e descrição."
  },
  "transaction": {
    "id": "clx1234567890",
    "title": "PAGAMENTO CARTÃO CREDITO",
    "description": "Compra no estabelecimento",
    "amount": -15000,
    "type": "PAYABLE",
    "transactionDate": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. **Categorizar Transação** - `POST /ai-categorization/categorize/:transactionId`
Aplica uma categoria a uma transação específica.

**Body:**
```json
{
  "categoryId": "clx1234567892",
  "confidence": 85,
  "reasoning": "Categorização baseada na análise da transação"
}
```

**Resposta:**
```json
{
  "message": "Transação categorizada com sucesso",
  "transactionId": "clx1234567890",
  "categoryId": "clx1234567892",
  "categoryName": "Alimentação"
}
```

### 4. **Sugestões em Lote** - `POST /ai-categorization/batch-suggest`
Gera sugestões de categoria para até 10 transações pendentes de uma vez.

**Resposta:**
```json
{
  "message": "Sugestões geradas para 5 transações",
  "suggestions": [
    {
      "transactionId": "clx1234567890",
      "transactionTitle": "PAGAMENTO CARTÃO CREDITO",
      "suggestion": {
        "categoryId": "clx1234567892",
        "categoryName": "Alimentação",
        "confidence": 85,
        "reasoning": "Transação parece ser compra em estabelecimento alimentício"
      }
    },
    {
      "transactionId": "clx1234567891",
      "transactionTitle": "TRANSFERENCIA RECEBIDA",
      "suggestion": {
        "categoryId": "clx1234567893",
        "categoryName": "Vendas",
        "confidence": 90,
        "reasoning": "Transferência recebida parece ser pagamento de venda"
      }
    }
  ]
}
```

## 🤖 Como Funciona a Categorização Automática

### Durante Importação OFX
1. **Processamento**: Cada transação é analisada pelo ChatGPT
2. **Contexto**: Título, descrição, valor e tipo da transação são enviados
3. **Categorias Disponíveis**: Lista de categorias do tipo correto (PAYABLE/RECEIVABLE)
4. **Sugestão**: ChatGPT sugere a categoria mais apropriada
5. **Aplicação Automática**: Se confiança ≥ 70%, categoria é aplicada automaticamente
6. **Transações Pendentes**: Transações com confiança < 70% ficam para revisão manual

### Critérios de Análise
- **Título da Transação**: Principal fonte de informação
- **Descrição**: Informações adicionais do banco
- **Valor**: Considerado para determinar tipo (receita/despesa)
- **Padrões**: Reconhecimento de estabelecimentos, serviços, etc.

### Níveis de Confiança
- **90-100%**: Categorização automática aplicada
- **70-89%**: Categorização automática aplicada
- **< 70%**: Fica pendente para revisão manual

## 📊 Exemplos de Categorização

### Despesas (PAYABLE)
| Transação | Categoria Sugerida | Confiança |
|-----------|-------------------|-----------|
| "PAGAMENTO CARTÃO CREDITO" | Alimentação | 85% |
| "COMPRA SUPERMERCADO" | Alimentação | 95% |
| "POSTO COMBUSTIVEL" | Transporte | 90% |
| "UBER" | Transporte | 95% |
| "NETFLIX" | Lazer | 90% |
| "ENERGIA ELETRICA" | Moradia | 95% |
| "AGUA" | Moradia | 95% |
| "FARMACIA" | Saúde | 90% |
| "ESCOLA" | Educação | 95% |

### Receitas (RECEIVABLE)
| Transação | Categoria Sugerida | Confiança |
|-----------|-------------------|-----------|
| "TRANSFERENCIA RECEBIDA" | Vendas | 85% |
| "PIX RECEBIDO" | Vendas | 80% |
| "SALARIO" | Vendas | 90% |
| "DIVIDENDOS" | Investimentos | 95% |
| "JUROS" | Investimentos | 90% |

## ⚠️ Tratamento de Erros

### Erros Comuns
```json
// Transação não encontrada
{
  "statusCode": 400,
  "message": "Transação não encontrada"
}

// Transação já categorizada
{
  "statusCode": 400,
  "message": "Transação já possui categoria"
}

// Categoria não encontrada
{
  "statusCode": 400,
  "message": "Categoria não encontrada"
}

// OpenAI não configurado
{
  "suggestion": null,
  "message": "Categorização automática desabilitada"
}
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente
```bash
# Obrigatório para categorização automática
OPENAI_API_KEY=sua_chave_api_openai_aqui

# Configurações opcionais
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=500
```

### Logs
O sistema registra logs detalhados:
- Sugestões de categoria geradas
- Confiança das categorizações
- Erros de API do OpenAI
- Transações categorizadas automaticamente

## 🚀 Melhorias Futuras

### Planejadas
- [ ] **Aprendizado**: Melhorar sugestões baseado em categorizações manuais
- [ ] **Regras Customizadas**: Permitir regras específicas por usuário
- [ ] **Confiança Dinâmica**: Ajustar threshold baseado no histórico
- [ ] **Categorias Personalizadas**: Sugerir criação de novas categorias
- [ ] **Batch Processing**: Processar mais transações simultaneamente

### Funcionalidades Avançadas
- [ ] **Análise de Padrões**: Identificar padrões recorrentes
- [ ] **Categorização Inteligente**: Aprender com escolhas do usuário
- [ ] **Relatórios**: Estatísticas de categorização automática
- [ ] **Exportação**: Exportar dados de categorização

## 📈 Métricas de Performance

### Indicadores
- **Taxa de Acerto**: % de categorizações corretas
- **Confiança Média**: Confiança média das sugestões
- **Tempo de Processamento**: Tempo para gerar sugestões
- **Transações Pendentes**: Quantidade de transações sem categoria

### Otimizações
- **Cache**: Cache de sugestões similares
- **Rate Limiting**: Controle de requisições à API OpenAI
- **Batch Processing**: Processamento em lotes para eficiência
- **Fallback**: Categorização manual quando AI falha 