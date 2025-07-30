# Sistema de Permissões - ERP Vertkall

## Visão Geral

O sistema implementa um controle de acesso granular baseado em permissões específicas por recurso e ação. Administradores podem gerenciar as permissões de outros usuários.

## Estrutura de Permissões

### Campos do Usuário
- `isAdmin`: Boolean que determina se o usuário é administrador
- Administradores têm acesso total a todas as funcionalidades

### Permissões Granulares
Cada permissão é composta por:
- **Módulo**: `financeiro`
- **Recurso**: `categories`, `transactions`, `payment_methods`, `recurring_transactions`
- **Ação**: `read`, `write`

### Exemplos de Permissões
- `financeiro:categories:read` - Pode visualizar categorias
- `financeiro:categories:write` - Pode criar/editar/excluir categorias
- `financeiro:transactions:read` - Pode visualizar transações
- `financeiro:transactions:write` - Pode criar/editar/excluir transações

## Como Funciona

### 1. Verificação de Admin
Se o usuário tem `isAdmin: true`, ele tem acesso total.

### 2. Verificação de Permissões Específicas
Se não for admin, o sistema verifica se o usuário tem a permissão específica para:
- Módulo específico
- Recurso específico  
- Ação específica

### 3. Guards Implementados

#### AdminGuard
- Verifica se o usuário é administrador
- Usado em rotas administrativas

#### PermissionGuard
- Verifica permissões específicas por recurso/ação
- Usado em todas as rotas do módulo financeiro

#### ModuleAccessGuard
- Verifica acesso ao módulo
- Mantido para compatibilidade

## Rotas Administrativas

### Gerenciamento de Usuários
- `GET /users` - Lista todos os usuários
- `GET /users/:id` - Busca usuário específico
- `POST /users/:id/toggle-admin` - Altera status de admin

### Gerenciamento de Permissões
- `PUT /users/:id/permissions` - Atualiza permissões de um usuário
- `GET /users/:id/permissions` - Busca permissões de um usuário
- `GET /users/me/permissions` - Busca minhas permissões

## Exemplo de Uso

### 1. Criar um usuário normal
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Usuário Normal"
}
```

### 2. Fazer login como admin
```bash
POST /auth/login
{
  "email": "admin@erpvertkall.com",
  "password": "admin123"
}
```

### 3. Dar permissões ao usuário
```bash
PUT /users/user-id/permissions
{
  "moduleId": "financeiro-module-id",
  "permissions": [
    {
      "resource": "transactions",
      "action": "read",
      "isActive": true
    },
    {
      "resource": "transactions", 
      "action": "write",
      "isActive": false
    }
  ]
}
```

## Setup Inicial

### 1. Executar migração
```bash
npm run db:migrate
```

### 2. Criar admin padrão
```bash
npm run db:seed:admin
```

### 3. Criar dados iniciais
```bash
npm run db:seed
```

## Usuário Administrador Padrão

- **Email**: `admin@erpvertkall.com`
- **Senha**: `admin123`
- **Permissões**: Todas as permissões ativas

## Recursos Disponíveis

### Módulo Financeiro
- **categories**: Gerenciamento de categorias
- **transactions**: Gerenciamento de transações
- **payment_methods**: Gerenciamento de métodos de pagamento
- **recurring_transactions**: Gerenciamento de transações recorrentes

### Ações Disponíveis
- **read**: Visualização
- **write**: Criação, edição e exclusão

## Segurança

- Todas as rotas administrativas requerem autenticação e status de admin
- Permissões são verificadas em tempo real
- Usuários sem permissão recebem erro 403 (Forbidden)
- Senhas são hasheadas com bcrypt
- Tokens JWT para autenticação 