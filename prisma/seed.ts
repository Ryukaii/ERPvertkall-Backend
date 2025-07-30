import { PrismaClient, FinancialTransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar módulos do sistema
  const financeiroModule = await prisma.module.upsert({
    where: { name: 'financeiro' },
    update: {},
    create: {
      name: 'financeiro',
      displayName: 'Módulo Financeiro',
      description: 'Gestão de contas a pagar e receber',
      isActive: true,
    },
  });

  const bancosModule = await prisma.module.upsert({
    where: { name: 'bancos' },
    update: {},
    create: {
      name: 'bancos',
      displayName: 'Módulo de Bancos',
      description: 'Gestão de bancos e transações bancárias',
      isActive: true,
    },
  });

  const unidadesModule = await prisma.module.upsert({
    where: { name: 'unidades' },
    update: {},
    create: {
      name: 'unidades',
      displayName: 'Módulo de Unidades',
      description: 'Gestão de unidades organizacionais',
      isActive: true,
    },
  });

  const tagsModule = await prisma.module.upsert({
    where: { name: 'tags' },
    update: {},
    create: {
      name: 'tags',
      displayName: 'Módulo de Tags',
      description: 'Gestão de tags para categorização',
      isActive: true,
    },
  });

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: {
      email: 'admin@erp.com',
      password: hashedPassword,
      name: 'Administrador',
      isAdmin: true,
    },
  });

  // Criar permissões para o admin
  const financeiroResources = ['categories', 'transactions', 'payment_methods', 'recurring_transactions'];
  const bancosResources = ['banks', 'bank_transactions', 'ofx_imports', 'transfers', 'ai_categorization'];
  const unidadesResources = ['unidades'];
  const tagsResources = ['tags'];
  const actions = ['read', 'write'];

  // Permissões do módulo financeiro
  for (const resource of financeiroResources) {
    for (const action of actions) {
      await prisma.userPermission.upsert({
        where: {
          userId_moduleId_resource_action: {
            userId: adminUser.id,
            moduleId: financeiroModule.id,
            resource,
            action,
          },
        },
        update: { isActive: true },
        create: {
          userId: adminUser.id,
          moduleId: financeiroModule.id,
          resource,
          action,
          isActive: true,
        },
      });
    }
  }

  // Permissões do módulo bancos
  for (const resource of bancosResources) {
    for (const action of actions) {
      await prisma.userPermission.upsert({
        where: {
          userId_moduleId_resource_action: {
            userId: adminUser.id,
            moduleId: bancosModule.id,
            resource,
            action,
          },
        },
        update: { isActive: true },
        create: {
          userId: adminUser.id,
          moduleId: bancosModule.id,
          resource,
          action,
          isActive: true,
        },
      });
    }
  }

  // Permissões do módulo unidades
  for (const resource of unidadesResources) {
    for (const action of actions) {
      await prisma.userPermission.upsert({
        where: {
          userId_moduleId_resource_action: {
            userId: adminUser.id,
            moduleId: unidadesModule.id,
            resource,
            action,
          },
        },
        update: { isActive: true },
        create: {
          userId: adminUser.id,
          moduleId: unidadesModule.id,
          resource,
          action,
          isActive: true,
        },
      });
    }
  }

  // Permissões do módulo tags
  for (const resource of tagsResources) {
    for (const action of actions) {
      await prisma.userPermission.upsert({
        where: {
          userId_moduleId_resource_action: {
            userId: adminUser.id,
            moduleId: tagsModule.id,
            resource,
            action,
          },
        },
        update: { isActive: true },
        create: {
          userId: adminUser.id,
          moduleId: tagsModule.id,
          resource,
          action,
          isActive: true,
        },
      });
    }
  }

  // Criar categorias financeiras
  const categories = [
    {
      name: 'Vendas',
      description: 'Receitas provenientes de vendas',
      type: FinancialTransactionType.RECEIVABLE,
    },
    {
      name: 'Compras',
      description: 'Despesas com compras de produtos',
      type: FinancialTransactionType.PAYABLE,
    },
    {
      name: 'Salários',
      description: 'Despesas com folha de pagamento',
      type: FinancialTransactionType.PAYABLE,
    },
    {
      name: 'Serviços',
      description: 'Receitas de prestação de serviços',
      type: FinancialTransactionType.RECEIVABLE,
    },
  ];

  for (const category of categories) {
    await prisma.financialCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  // Criar métodos de pagamento
  const paymentMethods = [
    { name: 'PIX' },
    { name: 'Boleto' },
    { name: 'Cartão de Crédito' },
    { name: 'Cartão de Débito' },
    { name: 'Dinheiro' },
    { name: 'Transferência Bancária' },
  ];

  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { name: method.name },
      update: {},
      create: method,
    });
  }

  console.log('✅ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 