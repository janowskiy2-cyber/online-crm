import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding clean Production CRM: 1 Root Admin, 0 fake mock users...');

  // Clean all test data
  await prisma.dealNote.deleteMany();
  await prisma.task.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.messengerSession.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create ONLY Root Master Admin (No fake users!)
  const rootAdmin = await prisma.user.create({
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

  // 2. Create Core Pipelines across 4 Workspaces
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
          { name: 'Прорахунок & КП (PDF)', color: '#06b6d4', sortOrder: 2 },
          { name: 'Узгодження договору (25%)', color: '#f59e0b', sortOrder: 3 },
          { name: 'Договір підписано / В роботі', color: '#10b981', isWon: true, sortOrder: 4 },
          { name: 'Відмова', color: '#ef4444', isLost: true, sortOrder: 5 }
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
      id: 'pipe-agencies-partners',
      name: '🤝 Кадрові агенції: Постачальники з країн-донорів',
      isDefault: false,
      sortOrder: 2,
      stages: {
        create: [
          { name: 'Переговори з агенцією', color: '#64748b', sortOrder: 0 },
          { name: 'Агентський договір підписано', color: '#3b82f6', sortOrder: 1 },
          { name: 'Отримання пулу резюме (пачка)', color: '#06b6d4', sortOrder: 2 },
          { name: 'Виплата агентської комісії', color: '#10b981', isWon: true, sortOrder: 3 }
        ]
      }
    }
  });

  // Workspace 4: Legal & Logistics (Візи та кордон)
  await prisma.pipeline.create({
    data: {
      id: 'pipe-legal-logistics',
      name: '🏛️ Візи & Логістика: Дозволи, Візи D, Кордон',
      isDefault: false,
      sortOrder: 3,
      stages: {
        create: [
          { name: '1. Подача в Держпрацю (~7 днів)', color: '#3b82f6', sortOrder: 0 },
          { name: '2. Дозвіл отримано / Держзбір', color: '#06b6d4', sortOrder: 1 },
          { name: '3. Робоча віза D у консульстві', color: '#f59e0b', sortOrder: 2 },
          { name: '4. Транзитний хаб Молдова ➔ Одеса', color: '#ec4899', sortOrder: 3 },
          { name: '5. Прибуття на підприємство / Вихід', color: '#10b981', isWon: true, sortOrder: 4 }
        ]
      }
    }
  });

  console.log('✅ Clean Database Ready. Master Admin: admin@crm.pro / 22222222');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
