# ERP Vertkall - Backend

Backend do sistema ERP modular desenvolvido com NestJS, Prisma e PostgreSQL.

## 🚀 Tecnologias

- **Node.js** + **TypeScript**
- **NestJS** - Framework para APIs robustas
- **Prisma** - ORM moderno para TypeScript
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação stateless
- **bcrypt** - Hash de senhas

## 📁 Estrutura do Projeto

```
src/
├── modules/
│   ├── auth/           # Módulo de autenticação
│   └── financeiro/     # Módulo financeiro
├── common/
│   ├── guards/         # Guards de autenticação e autorização
│   └── decorators/     # Decorators customizados
├── config/             # Configurações e serviços
└── main.ts            # Ponto de entrada da aplicação
```

## ⚙️ Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL 12+
- npm ou yarn

### Instalação

1. **Instalar dependências:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configurar banco de dados:**
   
   Crie um banco PostgreSQL e configure a URL de conexão:
   \`\`\`bash
   # Criar arquivo .env na raiz do backend
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/erp_vertkall?schema=public"
   JWT_SECRET="sua_chave_secreta_jwt_aqui"
   JWT_EXPIRES_IN="7d"
   PORT=3000
   \`\`\`

3. **Executar migrações e seed:**
   \`\`\`bash
   # Gerar cliente Prisma
   npm run db:generate
   
   # Executar migrações
   npm run db:migrate
   
   # Popular banco com dados iniciais
   npm run db:seed
   \`\`\`

### Scripts Disponíveis

\`\`\`bash
# Desenvolvimento
npm run start:dev          # Iniciar em modo desenvolvimento
npm run start:debug        # Iniciar com debug

# Produção
npm run build              # Build do projeto
npm run start:prod         # Iniciar em produção

# Banco de dados
npm run db:generate        # Gerar cliente Prisma
npm run db:migrate         # Executar migrações
npm run db:seed           # Popular banco com dados iniciais
npm run db:reset          # Resetar banco e executar seed

# Testes
npm run test              # Executar testes
npm run test:watch        # Executar testes em modo watch
npm run test:e2e          # Executar testes end-to-end
\`\`\`

## 🔐 Autenticação

O sistema utiliza JWT para autenticação. Após o seed, você pode usar:

- **Email:** admin@erp.com
- **Senha:** admin123

### Exemplo de Login

\`\`\`bash
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@erp.com",
    "password": "admin123"
  }'
\`\`\`

## 📊 Módulo Financeiro

### Funcionalidades

- ✅ Gestão de categorias financeiras
- ✅ Cadastro de métodos de pagamento
- ✅ Contas a pagar e receber
- ✅ Dashboard com resumos financeiros
- ✅ Filtros por período, status, categoria
- ✅ Histórico de transações
- ✅ Controle de status (pendente, pago, vencido)

### Endpoints Principais

\`\`\`
# Autenticação
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/profile

# Categorias Financeiras
GET    /api/financeiro/categories
POST   /api/financeiro/categories
PATCH  /api/financeiro/categories/:id
DELETE /api/financeiro/categories/:id

# Métodos de Pagamento
GET    /api/financeiro/payment-methods
POST   /api/financeiro/payment-methods
PATCH  /api/financeiro/payment-methods/:id
DELETE /api/financeiro/payment-methods/:id

# Transações Financeiras
GET    /api/financeiro/transactions
GET    /api/financeiro/transactions/dashboard
POST   /api/financeiro/transactions
PATCH  /api/financeiro/transactions/:id
DELETE /api/financeiro/transactions/:id
PUT    /api/financeiro/transactions/:id/mark-as-paid
\`\`\`

## 🔧 Arquitetura Modular

O sistema foi projetado para ser facilmente expansível:

1. **Novos módulos** podem ser adicionados em \`src/modules/\`
2. **Controle de acesso** por módulo via guards
3. **Isolamento** de responsabilidades
4. **Reutilização** de componentes comuns

### Adicionando um Novo Módulo

1. Criar pasta em \`src/modules/novo-modulo/\`
2. Implementar DTOs, services e controllers
3. Adicionar no \`AppModule\`
4. Criar entrada na tabela \`modules\`
5. Configurar permissões de usuário

## 🐛 Debug e Logs

O sistema inclui logs detalhados para debug. Para visualizar:

\`\`\`bash
npm run start:debug
\`\`\`

## 📝 Validação

Todas as rotas utilizam validação automática via class-validator:

- ✅ Tipos de dados
- ✅ Campos obrigatórios
- ✅ Formatos (email, data, etc.)
- ✅ Transformação automática

## 🔄 CORS

O backend está configurado para aceitar conexões do frontend em:
- http://localhost:5173 (Vite)
- http://localhost:3000 (React)

## 🚀 Deploy

Para produção, configure:

1. Variáveis de ambiente seguras
2. Banco de dados PostgreSQL
3. Certificados SSL
4. Proxy reverso (nginx)

\`\`\`bash
# Build
npm run build

# Iniciar
npm run start:prod
\`\`\`
