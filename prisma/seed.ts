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
  const resources = ['categories', 'transactions', 'payment_methods', 'recurring_transactions'];
  const actions = ['read', 'write'];

  for (const resource of resources) {
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