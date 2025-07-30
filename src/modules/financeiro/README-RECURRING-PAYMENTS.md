# Pagamentos Recorrentes (Independentes)

Este módulo permite cadastrar e consultar pagamentos recorrentes importantes, separados das transações financeiras. Ideal para lembretes de contas fixas, assinaturas, anuidades, etc.

## Estrutura
- **Tabela:** `RecurringPayment` (Prisma)
- **Campos:**
  - `id`: Identificador único
  - `title`: Título do pagamento
  - `recurrenceType`: Tipo de recorrência (`DAILY`, `WEEKLY`, `MONTHLY`, `ANNUAL`)
  - `weekday`: (opcional) Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado) — apenas para semanal
  - `day`: (opcional) Dia do mês (1-31) — para mensal e anual
  - `month`: (opcional) Mês do ano (1-12) — apenas para anual
  - `paymentMethodId`: (opcional) ID do método de pagamento
  - `createdAt`, `updatedAt`: Datas de criação e atualização

## Endpoints

### Cadastrar pagamento recorrente
`POST /financeiro/recurring-payments`

#### Exemplos de payload:

**Diário:**
```json
{
  "title": "Backup diário",
  "recurrenceType": "DAILY"
}
```

**Semanal (toda segunda):**
```json
{
  "title": "Reunião semanal",
  "recurrenceType": "WEEKLY",
  "weekday": 1
}
```

**Mensal (todo dia 10):**
```json
{
  "title": "Aluguel",
  "recurrenceType": "MONTHLY",
  "day": 10
}
```

**Anual (todo 15 de março):**
```json
{
  "title": "IPVA",
  "recurrenceType": "ANNUAL",
  "day": 15,
  "month": 3
}
```

**Com método de pagamento:**
```json
{
  "title": "Assinatura",
  "recurrenceType": "MONTHLY",
  "day": 5,
  "paymentMethodId": "<id do método de pagamento>"
}
```

### Listar todos os pagamentos recorrentes
`GET /financeiro/recurring-payments`

**Resposta:**
```json
[
  {
    "id": "...",
    "title": "Aluguel",
    "recurrenceType": "MONTHLY",
    "day": 10,
    "paymentMethodId": "...",
    "paymentMethod": {
      "id": "...",
      "name": "PIX",
      ...
    },
    "createdAt": "...",
    "updatedAt": "..."
  },
  ...
]
```

## Observações
- Os pagamentos recorrentes **não geram transações financeiras automaticamente**. São lembretes/avisos para controle e planejamento.
- Os campos de data variam conforme o tipo de recorrência:
  - `DAILY`: não precisa de campo de data
  - `WEEKLY`: usar `weekday`
  - `MONTHLY`: usar `day`
  - `ANNUAL`: usar `day` e `month`
- O campo `paymentMethodId` é opcional, utilize um dos métodos já cadastrados no sistema.
- Para editar, remover ou filtrar por mês, basta estender os endpoints.

## Exemplo de uso
1. Cadastre um pagamento recorrente fixo:
   - Ex: assinatura anual, aluguel mensal, conta semanal.
2. Consulte todos os pagamentos recorrentes cadastrados para planejamento financeiro.

---
Dúvidas ou sugestões? Fale com o time de desenvolvimento! 