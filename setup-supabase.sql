-- Script para configurar usuário Prisma no Supabase
-- Execute este script no SQL Editor do Supabase

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

-- Verificar se o usuário foi criado
SELECT usename FROM pg_user WHERE usename = 'prisma';

-- Verificar permissões
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'prisma'; 