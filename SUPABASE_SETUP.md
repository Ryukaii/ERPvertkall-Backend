# Configuração Supabase + Prisma

## 🚨 Problema Atual
Erro de conexão: `Can't reach database server at db.luyssgqzusadwugobbbx.supabase.co:5432`

## 🔧 Solução Passo a Passo

### 1. Criar Usuário Prisma no Supabase

Execute este SQL no **SQL Editor** do Supabase:

```sql
-- Create custom user for Prisma
CREATE USER "prisma" WITH PASSWORD 'sua_senha_segura_aqui' BYPASSRLS CREATEDB;

-- Extend prisma's privileges to postgres (necessary to view changes in Dashboard)
GRANT "prisma" TO "postgres";

-- Grant it necessary permissions over the relevant schemas (public)
GRANT USAGE ON SCHEMA public TO prisma;
GRANT CREATE ON SCHEMA public TO prisma;
GRANT ALL ON ALL TABLES IN SCHEMA public TO prisma;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO prisma;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma;
```

### 2. Configurar Variáveis de Ambiente no Heroku

No **Heroku Dashboard** → **Settings** → **Config Vars**, adicione:

```bash
# Connection Pooling (para aplicação)
DATABASE_URL=postgresql://prisma.luyssgqzusadwugobbbx:sua_senha_prisma@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=5&pool_timeout=30&statement_cache_size=0&prepared_statements=false&schema=public

# Direct Connection (para migrações)
DIRECT_URL=postgresql://prisma.luyssgqzusadwugobbbx:sua_senha_prisma@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?schema=public

# Environment
NODE_ENV=production
```

### 3. Desabilitar PostgREST (Opcional)

Se você usar **apenas Prisma** (não Supabase Data API):
1. Vá para **Settings** → **API** no Supabase
2. Desabilite **PostgREST**

### 4. Verificar Configuração

```bash
# Verificar se as variáveis estão configuradas
heroku config

# Testar conexão
heroku run npx prisma db pull
```

### 5. Fazer Deploy

```bash
# Deploy com as novas configurações
git add .
git commit -m "fix: Update Prisma schema for Supabase with directUrl"
git push heroku main

# Verificar logs
heroku logs --tail
```

## 🔍 Troubleshooting

### Se ainda houver erro de conexão:

1. **Verificar se o usuário prisma foi criado:**
```sql
SELECT usename FROM pg_user WHERE usename = 'prisma';
```

2. **Verificar permissões:**
```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'prisma';
```

3. **Testar conexão direta:**
```bash
psql "postgresql://prisma.luyssgqzusadwugobbbx:sua_senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

### Comandos Úteis

```bash
# Verificar status das migrações
heroku run npx prisma migrate status

# Fazer migrate em produção
heroku run npx prisma migrate deploy

# Reset do banco (CUIDADO!)
heroku run npx prisma migrate reset --force

# Verificar logs em tempo real
heroku logs --tail
```

## 📋 Checklist

- [ ] Criar usuário `prisma` no Supabase
- [ ] Configurar `DATABASE_URL` no Heroku
- [ ] Configurar `DIRECT_URL` no Heroku
- [ ] Fazer deploy da aplicação
- [ ] Testar conexão
- [ ] Verificar logs

## ⚠️ Importante

- **Sempre use senhas seguras** para o usuário prisma
- **Mantenha as credenciais seguras** (não commite no git)
- **Teste localmente** antes de fazer deploy
- **Monitore os logs** após o deploy 