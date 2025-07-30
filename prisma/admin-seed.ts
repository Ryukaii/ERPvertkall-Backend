import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do administrador...');

  // Criar módulo financeiro
  const financialModule = await prisma.module.upsert({
    where: { name: 'financeiro' },
    update: {},
    create: {
      name: 'financeiro',
      displayName: 'Módulo Financeiro',
      description: 'Gestão de contas a pagar e receber',
      isActive: true,
    },
  });

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@erpvertkall.com' },
    update: {},
    create: {
      email: 'admin@erpvertkall.com',
      password: hashedPassword,
      name: 'Administrador',
      isAdmin: true,
    },
  });

  if (admin) {
    // Criar permissões padrão para o admin
    const resources = ['categories', 'transactions', 'payment_methods', 'recurring_transactions'];
    const actions = ['read', 'write'];

    for (const resource of resources) {
      for (const action of actions) {
        await prisma.userPermission.upsert({
          where: {
            userId_moduleId_resource_action: {
              userId: admin.id,
              moduleId: financialModule.id,
              resource,
              action,
            },
          },
          update: { isActive: true },
          create: {
            userId: admin.id,
            moduleId: financialModule.id,
            resource,
            action,
            isActive: true,
          },
        });
      }
    }

    console.log('Permissões padrão criadas para o administrador');
  }

  console.log('✅ Seed do administrador concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 