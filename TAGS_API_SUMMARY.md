# 🏷️ Sistema de Tags - Resumo das APIs

## 📋 Rotas Principais

### Gerenciamento de Tags
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/tags` | Listar tags (com filtros e paginação) |
| `POST` | `/tags` | Criar nova tag |
| `GET` | `/tags/:id` | Buscar tag específica |
| `PATCH` | `/tags/:id` | Atualizar tag |
| `PATCH` | `/tags/:id/toggle-active` | Ativar/desativar tag |
| `DELETE` | `/tags/:id` | Excluir tag |
| `GET` | `/tags/most-used` | Tags mais usadas |

### Tags em Transações Bancárias
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/bancos/:bankId/transactions` | Criar transação com tags |
| `PATCH` | `/bancos/:bankId/transactions/:id` | Atualizar transação com tags |

### Tags em Transações Financeiras
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/financial-transactions` | Criar transação com tags |
| `PATCH` | `/financial-transactions/:id` | Atualizar transação com tags |

### Tags na Revisão OFX
| Método | Rota | Descrição |
|--------|------|-----------|
| `PATCH` | `/ofx-pending-transactions/:id/tags` | Atualizar tags de transação OFX |

## 🔧 Exemplos Rápidos

### Criar Tag
```bash
POST /tags
{
  "name": "Alimentação",
  "color": "#FF5733",
  "description": "Despesas com alimentação"
}
```

### Criar Transação com Tags
```bash
POST /bancos/bank_123/transactions
{
  "title": "Almoço",
  "amount": 4500,
  "type": "DEBIT",
  "tagIds": ["tag_123", "tag_456"]
}
```

### Adicionar Tags na Revisão OFX
```bash
PATCH /ofx-pending-transactions/ofx_123/tags
{
  "tagIds": ["tag_123", "tag_456"]
}
```

## ⚡ Funcionalidades

- ✅ **CRUD completo** de tags
- ✅ **Validação** de tags existentes e ativas
- ✅ **Múltiplas tags** por transação
- ✅ **Herança** de tags ao aprovar OFX
- ✅ **Filtros** e paginação
- ✅ **Soft delete** para tags
- ✅ **Documentação** Swagger completa

## 🎯 Casos de Uso

1. **Categorização granular**: Tags + categorias
2. **Filtros avançados**: Por tags específicas
3. **Relatórios personalizados**: Baseados em tags
4. **Revisão OFX**: Adicionar tags durante revisão

---

**Status**: ✅ Implementado e pronto para uso 