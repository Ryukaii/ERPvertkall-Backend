import { PrismaClient, BankAccountType, BankDocumentType, FinancialTransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de bancos...');

  // Buscar um usuário existente para as transações
  const user = await prisma.user.findFirst();
  
  if (!user) {
    console.log('❌ Nenhum usuário encontrado. Execute primeiro o seed de usuários.');
    return;
  }

  // Criar bancos de exemplo (globais do sistema)
  const banks = [
    {
      name: 'Nubank',
      accountNumber: '12345678',
      accountType: 'CHECKING' as BankAccountType,
      balance: 500000, // R$ 5.000,00
      documentType: 'CPF' as BankDocumentType,
      document: '123.456.789-00',
      holderName: 'João Silva',
    },
    {
      name: 'Itaú',
      accountNumber: '87654321',
      accountType: 'CHECKING' as BankAccountType,
      balance: 1000000, // R$ 10.000,00
      documentType: 'CPF' as BankDocumentType,
      document: '987.654.321-00',
      holderName: 'Maria Santos',
    },
    {
      name: 'Caixa Econômica',
      accountNumber: '11223344',
      accountType: 'SAVINGS' as BankAccountType,
      balance: 250000, // R$ 2.500,00
      documentType: 'CPF' as BankDocumentType,
      document: '111.222.333-44',
      holderName: 'Pedro Oliveira',
    },
    {
      name: 'Cartão de Crédito Nubank',
      accountNumber: 'NUBANK-CC',
      accountType: 'CREDIT' as BankAccountType,
      balance: 0, // Cartão de crédito começa com saldo 0
      documentType: 'CPF' as BankDocumentType,
      document: '123.456.789-00',
      holderName: 'João Silva',
    },
    {
      name: 'Banco do Brasil',
      accountNumber: '99887766',
      accountType: 'CHECKING' as BankAccountType,
      balance: 750000, // R$ 7.500,00
      documentType: 'CNPJ' as BankDocumentType,
      document: '12.345.678/0001-90',
      holderName: 'Empresa ABC Ltda',
    },
  ];

  for (const bankData of banks) {
    const existingBank = await prisma.bank.findFirst({
      where: {
        name: bankData.name,
      },
    });

    if (!existingBank) {
      const bank = await prisma.bank.create({
        data: bankData,
      });
      console.log(`✅ Banco criado: ${bank.name} - ${bank.holderName}`);
    } else {
      console.log(`⏭️ Banco já existe: ${bankData.name}`);
    }
  }

  // Buscar categorias e métodos de pagamento existentes
  const categories = await prisma.financialCategory.findMany();
  const paymentMethods = await prisma.paymentMethod.findMany();

  if (categories.length > 0 && paymentMethods.length > 0) {
    // Criar algumas transações de exemplo
    const nubankBank = await prisma.bank.findFirst({
      where: { name: 'Nubank' },
    });

    if (nubankBank) {
      const transactions = [
        {
          title: 'Salário',
          description: 'Salário do mês',
          amount: 500000, // R$ 5.000,00
          transactionDate: new Date('2024-01-15'),
          type: 'CREDIT' as FinancialTransactionType,
          categoryId: categories[0]?.id,
          paymentMethodId: paymentMethods[0]?.id,
          bankId: nubankBank.id,
          userId: user.id, // Transações ainda são do usuário
        },
        {
          title: 'Supermercado',
          description: 'Compras do mês',
          amount: -150000, // -R$ 1.500,00
          transactionDate: new Date('2024-01-16'),
          type: 'DEBIT' as FinancialTransactionType,
          categoryId: categories[1]?.id,
          paymentMethodId: paymentMethods[1]?.id,
          bankId: nubankBank.id,
          userId: user.id, // Transações ainda são do usuário
        },
        {
          title: 'Transferência recebida',
          description: 'Transferência de João',
          amount: 100000, // R$ 1.000,00
          transactionDate: new Date('2024-01-17'),
          type: 'CREDIT' as FinancialTransactionType,
          categoryId: categories[0]?.id,
          paymentMethodId: paymentMethods[0]?.id,
          bankId: nubankBank.id,
          userId: user.id, // Transações ainda são do usuário
        },
      ];

      for (const transactionData of transactions) {
        const existingTransaction = await prisma.financialTransaction.findFirst({
          where: {
            title: transactionData.title,
            bankId: nubankBank.id,
            transactionDate: transactionData.transactionDate,
          },
        });

        if (!existingTransaction) {
          const transaction = await prisma.financialTransaction.create({
            data: transactionData,
          });
          console.log(`✅ Transação criada: ${transaction.title}`);
        } else {
          console.log(`⏭️ Transação já existe: ${transactionData.title}`);
        }
      }
    }
  }

  console.log('✅ Seed de bancos concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de bancos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 