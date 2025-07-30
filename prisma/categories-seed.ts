import { PrismaClient, FinancialTransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  // Categorias de Receitas (RECEIVABLE)
  {
    name: 'Vendas',
    description: 'Receitas provenientes de vendas de produtos ou serviços',
    type: FinancialTransactionType.RECEIVABLE,
  },
  {
    name: 'Comissões',
    description: 'Comissões recebidas por vendas ou serviços',
    type: FinancialTransactionType.RECEIVABLE,
  },
  {
    name: 'Investimentos',
    description: 'Rendimentos de investimentos e aplicações financeiras',
    type: FinancialTransactionType.RECEIVABLE,
  },
  {
    name: 'Empréstimos Recebidos',
    description: 'Empréstimos e financiamentos recebidos',
    type: FinancialTransactionType.RECEIVABLE,
  },
  {
    name: 'Freelance',
    description: 'Trabalhos freelancer e serviços prestados',
    type: FinancialTransactionType.RECEIVABLE,
  },
  {
    name: 'Aluguel Recebido',
    description: 'Receitas de aluguel de imóveis ou bens',
    type: FinancialTransactionType.RECEIVABLE,
  },
  {
    name: 'Outras Receitas',
    description: 'Outras receitas não categorizadas',
    type: FinancialTransactionType.RECEIVABLE,
  },

  // Categorias de Despesas (PAYABLE)
  {
    name: 'Alimentação',
    description: 'Gastos com alimentação, refeições e lanches',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Transporte',
    description: 'Combustível, transporte público, Uber, etc.',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Moradia',
    description: 'Aluguel, condomínio, IPTU, manutenção',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Saúde',
    description: 'Plano de saúde, medicamentos, consultas',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Educação',
    description: 'Cursos, livros, material escolar',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Lazer',
    description: 'Entretenimento, viagens, hobbies',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Serviços',
    description: 'Internet, telefone, streaming, assinaturas',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Impostos',
    description: 'Impostos e taxas governamentais',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Vestuário',
    description: 'Roupas, calçados, acessórios',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Manutenção',
    description: 'Reparos, manutenção de veículos e equipamentos',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Seguros',
    description: 'Seguros de vida, veículo, residência',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Empréstimos',
    description: 'Prestações de empréstimos e financiamentos',
    type: FinancialTransactionType.PAYABLE,
  },
  {
    name: 'Outras Despesas',
    description: 'Outras despesas não categorizadas',
    type: FinancialTransactionType.PAYABLE,
  },
];

async function seedCategories() {
  console.log('🌱 Iniciando seed de categorias...');

  for (const category of defaultCategories) {
    try {
      const existingCategory = await prisma.financialCategory.findUnique({
        where: { name: category.name },
      });

      if (!existingCategory) {
        await prisma.financialCategory.create({
          data: category,
        });
        console.log(`✅ Categoria criada: ${category.name}`);
      } else {
        console.log(`⏭️  Categoria já existe: ${category.name}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar categoria ${category.name}:`, error);
    }
  }

  console.log('🎉 Seed de categorias concluído!');
}

async function main() {
  await seedCategories();
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Erro no seed:', error);
  process.exit(1);
}); 