# Sistema de Aprovação de Usuários

## Visão Geral

O sistema agora implementa um processo de aprovação para novos cadastros de usuários. Após o registro, os usuários precisam ser aprovados por um administrador ou usuário com permissão específica antes de poderem acessar o sistema.

## Fluxo de Cadastro e Aprovação

### 1. Cadastro do Usuário
- Usuário se registra via `/auth/register`
- Conta é criada com `isApproved: false`
- Usuário recebe mensagem informando que aguarda aprovação
- **Nenhuma permissão é criada automaticamente**

### 2. Aprovação pelo Administrador
- Administrador ou usuário com permissão de aprovação acessa `/users/pending-approvals`
- Visualiza lista de usuários pendentes
- Aprova usuário via `/users/:id/approve`
- **Permissões padrão são criadas automaticamente na aprovação**

### 3. Acesso ao Sistema
- Usuário aprovado pode fazer login normalmente
- Sistema verifica `isApproved` no login
- Se não aprovado, recebe erro informativo

## Rotas de Aprovação

### Listar Usuários Pendentes
```http
GET /users/pending-approvals
Authorization: Bearer <token>
```

**Permissão necessária:** `users:user_approval:read`

### Aprovar/Rejeitar Usuário
```http
PUT /users/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "isApproved": true
}
```

**Permissão necessária:** `users:user_approval:write`

### Filtrar Usuários
```http
GET /users?isApproved=false&isAdmin=false
Authorization: Bearer <token>
```

## Permissões de Aprovação

### Módulo: `users`
- **Recurso:** `user_approval`
- **Ações:** `read`, `write`

### Quem pode aprovar:
1. **Administradores** (`isAdmin: true`) - Podem aprovar qualquer usuário
2. **Usuários com permissão específica** - Precisam ter a permissão `users:user_approval:write`

## Configuração de Permissões

Para dar permissão de aprovação a um usuário não-admin:

```http
PUT /users/:id/permissions
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "moduleId": "users-module-id",
  "permissions": [
    {
      "resource": "user_approval",
      "action": "read",
      "isActive": true
    },
    {
      "resource": "user_approval", 
      "action": "write",
      "isActive": true
    }
  ]
}
```

## Permissões Padrão Criadas na Aprovação

Quando um usuário é aprovado, as seguintes permissões são criadas automaticamente:

### Módulo Financeiro
- `financial_transactions:read`
- `financial_categories:read` 
- `payment_methods:read`

## Validações

### No Registro
- Email deve ser único
- Senha deve ter pelo menos 6 caracteres
- Nome é obrigatório

### No Login
- Credenciais devem ser válidas
- Usuário deve estar aprovado (`isApproved: true`)

### Na Aprovação
- Aprovador deve ser admin ou ter permissão específica
- Usuário deve existir
- Permissões padrão são criadas apenas na primeira aprovação

## Mensagens de Erro

### Usuário não aprovado tentando fazer login:
```
{
  "statusCode": 401,
  "message": "Conta ainda não foi aprovada. Entre em contato com o administrador.",
  "error": "Unauthorized"
}
```

### Tentativa de aprovação sem permissão:
```
{
  "statusCode": 403,
  "message": "Apenas administradores ou usuários com permissão de aprovação podem aprovar usuários",
  "error": "Forbidden"
}
```

## Migração do Banco de Dados

A migração `add_user_approval` adiciona o campo `isApproved` à tabela `users`:

```sql
ALTER TABLE "users" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;
```

## Considerações de Segurança

1. **Usuários não aprovados não podem fazer login**
2. **Usuários não aprovados não têm permissões**
3. **Apenas admins ou usuários com permissão específica podem aprovar**
4. **Permissões padrão são criadas apenas na aprovação**
5. **Campo `isApproved` é incluído nas respostas de login**

## Próximos Passos Sugeridos

1. Implementar notificação por email quando usuário é aprovado
2. Adicionar histórico de aprovações
3. Implementar rejeição com motivo
4. Adicionar configuração de permissões padrão por módulo
5. Implementar expiração de contas não aprovadas 