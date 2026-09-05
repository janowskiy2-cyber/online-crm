import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Production Safe Seed: strictly NON-DESTRUCTIVE. No tables will ever be wiped.');

  // 1. Ensure Root Master Admin exists without touching other users
  const adminExists = await prisma.user.findFirst({
    where: {
      OR: [
        { id: 'usr-admin' },
        { email: 'admin@crm.pro' }
      ]
    }
  });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        id: 'usr-admin',
        name: 'Головний Адміністратор',
        email: 'admin@crm.pro',
        password: '22222222',
        role: 'super_admin',
        department: 'Керівництво',
        phone: '+380 (73) 427-71-74',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isActive: true,
        canViewAllDeals: true,
        canViewDeptDeals: true,
        canEditDeals: true,
        canDeleteDeals: true,
        canExportData: true,
        canManageUsers: true,
        canManageIntegrations: true
      }
    });
    console.log('✅ Created root admin usr-admin');
  } else {
    console.log('ℹ️ Root admin already exists. Preserving all existing users.');
  }

  // 2. Ensure default pipelines exist without touching existing pipelines or deals
  const pipelineCount = await prisma.pipeline.count();
  if (pipelineCount === 0) {
    console.log('ℹ️ Initializing default pipelines...');
    
    // Workspace 1: Employers (Роботодавці)
    await prisma.pipeline.create({
      data: {
        id: 'pipe-employers-sales',
        name: '🏢 Роботодавці: B2B Продажі та Угоди',
        isDefault: true,
        sortOrder: 0,
        stages: {
          create: [
            { name: 'Нова заявка підприємства', color: '#64748b', sortOrder: 0 },
            { name: 'Дзвінок-кваліфікація (15 хв)', color: '#3b82f6', sortOrder: 1 },
            { name: 'Відправка КП (PDF 4х25%)', color: '#8b5cf6', sortOrder: 2 },
            { name: 'Прорахунок кошторису & Уточнення', color: '#06b6d4', sortOrder: 3 },
            { name: 'Узгодження договору (25%)', color: '#f59e0b', sortOrder: 4 },
            { name: 'Договір підписано / В роботі', color: '#10b981', isWon: true, sortOrder: 5 },
            { name: 'Відмова', color: '#ef4444', isLost: true, sortOrder: 6 }
          ]
        }
      }
    });

    // Workspace 2: Candidates (Кандидати)
    await prisma.pipeline.create({
      data: {
        id: 'pipe-candidates-funnel',
        name: '👤 Кандидати: Скринінг, Анкети та Інтерв\'ю',
        isDefault: false,
        sortOrder: 1,
        stages: {
          create: [
            { name: 'Нова анкета кандидата', color: '#64748b', sortOrder: 0 },
            { name: 'Перевірка паспорта & Відеовізитка', color: '#3b82f6', sortOrder: 1 },
            { name: 'Тестування мови / Спеціальності', color: '#06b6d4', sortOrder: 2 },
            { name: 'Інтерв\'ю з роботодавцем', color: '#f59e0b', sortOrder: 3 },
            { name: 'Кандидата затверджено', color: '#10b981', isWon: true, sortOrder: 4 },
            { name: 'Відхилено', color: '#ef4444', isLost: true, sortOrder: 5 }
          ]
        }
      }
    });

    // Workspace 3: Agencies (Агенції)
    await prisma.pipeline.create({
      data: {
        id: 'pipe-agencies-network',
        name: '🤝 Агенції: Партнерська мережа в Азії',
        isDefault: false,
        sortOrder: 2,
        stages: {
          create: [
            { name: 'Запит на співпрацю (Агенція)', color: '#64748b', sortOrder: 0 },
            { name: 'Перевірка ліцензії країни-донора', color: '#3b82f6', sortOrder: 1 },
            { name: 'Підписання Agency Agreement', color: '#06b6d4', sortOrder: 2 },
            { name: 'Активація пулу кандидатів', color: '#10b981', isWon: true, sortOrder: 3 }
          ]
        }
      }
    });

    // Workspace 4: Visas & Logistics (Візи та Логістика)
    await prisma.pipeline.create({
      data: {
        id: 'pipe-visas-logistics',
        name: '✈️ Візи: Дозволи, Візи D та Логістика',
        isDefault: false,
        sortOrder: 3,
        stages: {
          create: [
            { name: 'Подача в Держпраці / Центр зайнятості', color: '#64748b', sortOrder: 0 },
            { name: 'Дозвіл на працю отримано', color: '#3b82f6', sortOrder: 1 },
            { name: 'Оформлення візи D в консульстві', color: '#f59e0b', sortOrder: 2 },
            { name: 'Квитки & Транзит Молдова/Одеса', color: '#06b6d4', sortOrder: 3 },
            { name: 'Робітник прибув на завод', color: '#10b981', isWon: true, sortOrder: 4 }
          ]
        }
      }
    });
    console.log('✅ Default pipelines initialized.');
  } else {
    console.log('ℹ️ Pipelines already exist. Skipping creation to protect user custom pipelines and deals.');
  }

  console.log('🔒 Safe seed finished. Zero user records deleted.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
