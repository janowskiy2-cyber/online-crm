import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Recruiting CRM with Enterprise clients and 20 users...');

  // Clean old data
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

  // 1. Create 20 Users for International Recruiting Agency
  const usersData = [
    {
      id: 'usr-1',
      name: 'Олександр Громов',
      email: 'ceo@crm-online.pro',
      role: 'super_admin',
      department: 'Керівництво',
      phone: '+380 (50) 111-00-01',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: true,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: true,
      canExportData: true,
      canManageUsers: true,
      canManageIntegrations: true
    },
    {
      id: 'usr-2',
      name: 'Дмитро Орлов',
      email: 'cto@crm-online.pro',
      role: 'tech_admin',
      department: 'IT / Інтеграції',
      phone: '+380 (50) 111-00-02',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: true,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: true,
      canManageUsers: true,
      canManageIntegrations: true
    },
    {
      id: 'usr-3',
      name: 'Олена Смірнова',
      email: 'rop@crm-online.pro',
      role: 'sales_director',
      department: 'Відділ продажів B2B',
      phone: '+380 (50) 111-00-03',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: true,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: true,
      canExportData: true,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-4',
      name: 'Максим Кузнєцов',
      email: 'teamlead.b2b@crm-online.pro',
      role: 'sales_teamlead_b2b',
      department: 'Відділ продажів B2B',
      phone: '+380 (50) 111-00-04',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: true,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-5',
      name: 'Іван Соколов',
      email: 'senior.b2b@crm-online.pro',
      role: 'senior_sales_rep',
      department: 'Відділ продажів B2B',
      phone: '+380 (50) 111-00-05',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-6',
      name: 'Марія Попова',
      email: 'sales.b2b.1@crm-online.pro',
      role: 'sales_rep',
      department: 'Відділ продажів B2B',
      phone: '+380 (50) 111-00-06',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: false,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-7',
      name: 'Артем Новіков',
      email: 'sales.b2b.2@crm-online.pro',
      role: 'sales_rep',
      department: 'Відділ продажів B2B',
      phone: '+380 (50) 111-00-07',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: false,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-8',
      name: 'Ольга Федорова',
      email: 'ops.lead@crm-online.pro',
      role: 'ops_lead',
      department: 'Операційний & Візовий відділ',
      phone: '+380 (50) 111-00-08',
      avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: true,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: true,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-9',
      name: 'Кирило Морозов',
      email: 'recruiter.asia@crm-online.pro',
      role: 'international_recruiter',
      department: 'Операційний & Візовий відділ',
      phone: '+380 (50) 111-00-09',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-10',
      name: 'Дар\'я Волкова',
      email: 'visa.officer@crm-online.pro',
      role: 'visa_officer',
      department: 'Операційний & Візовий відділ',
      phone: '+380 (50) 111-00-10',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-11',
      name: 'Роман Алексєєв',
      email: 'sdr.leadgen@crm-online.pro',
      role: 'lead_gen_sdr',
      department: 'Лідогенерація',
      phone: '+380 (50) 111-00-11',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-12',
      name: 'Поліна Семенова',
      email: 'sdr.calls@crm-online.pro',
      role: 'lead_gen_sdr',
      department: 'Лідогенерація',
      phone: '+380 (50) 111-00-12',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-13',
      name: 'Сергій Лебедєв',
      email: 'ltv.lead@crm-online.pro',
      role: 'account_teamlead',
      department: 'Супровід & Адаптація (LTV)',
      phone: '+380 (50) 111-00-13',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: true,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-14',
      name: 'Вікторія Козлова',
      email: 'coordinator.client@crm-online.pro',
      role: 'account_manager',
      department: 'Супровід & Адаптація (LTV)',
      phone: '+380 (50) 111-00-14',
      avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: false,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-15',
      name: 'Ілля Павлов',
      email: 'support.lead@crm-online.pro',
      role: 'support_lead',
      department: 'Служба турботи',
      phone: '+380 (50) 111-00-15',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-16',
      name: 'Аліна Єгорова',
      email: 'support.agent@crm-online.pro',
      role: 'support_agent',
      department: 'Служба турботи',
      phone: '+380 (50) 111-00-16',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: false,
      canEditDeals: false,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-17',
      name: 'Владислав Макаров',
      email: 'cmo@crm-online.pro',
      role: 'marketing_lead',
      department: 'Маркетинг & Трафік',
      phone: '+380 (50) 111-00-17',
      avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: true,
      canViewDeptDeals: true,
      canEditDeals: false,
      canDeleteDeals: false,
      canExportData: true,
      canManageUsers: false,
      canManageIntegrations: true
    },
    {
      id: 'usr-18',
      name: 'Тетяна Зайцева',
      email: 'finance@crm-online.pro',
      role: 'finance_manager',
      department: 'Фінанси & Бухгалтерія',
      phone: '+380 (50) 111-00-18',
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: true,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: true,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-19',
      name: 'Костянтин Бєлов',
      email: 'legal@crm-online.pro',
      role: 'legal_advisor',
      department: 'Юридичний відділ',
      phone: '+380 (50) 111-00-19',
      avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: true,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: true,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-20',
      name: 'Анна Васильєва',
      email: 'auditor@crm-online.pro',
      role: 'read_only_auditor',
      department: 'Аудит & Інвестор',
      phone: '+380 (50) 111-00-20',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: true,
      canViewDeptDeals: true,
      canEditDeals: false,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    }
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }

  // 2. Create Recruiting Pipelines
  const salesPipeline = await prisma.pipeline.create({
    data: {
      name: 'B2B Продажі: Залучення роботодавців',
      isDefault: true,
      sortOrder: 0,
      stages: {
        create: [
          { name: 'Нова заявка підприємства', color: '#64748b', sortOrder: 0 },
          { name: 'Дзвінок-кваліфікація (15 хв)', color: '#3b82f6', sortOrder: 1 },
          { name: 'Прорахунок & Відправка КП', color: '#06b6d4', sortOrder: 2 },
          { name: 'Узгодження договору (25%)', color: '#f59e0b', sortOrder: 3 },
          { name: 'Договір підписано / В роботі', color: '#10b981', isWon: true, sortOrder: 4 },
          { name: 'Відмова клієнта', color: '#ef4444', isLost: true, sortOrder: 5 }
        ]
      }
    },
    include: { stages: true }
  });

  const opsPipeline = await prisma.pipeline.create({
    data: {
      name: 'Операційний процес: Візи та Доставка персоналу',
      isDefault: false,
      sortOrder: 1,
      stages: {
        create: [
          { name: '1. Договір і заявка (25%)', color: '#3b82f6', sortOrder: 0 },
          { name: '2. Скринінг & Інтерв\'ю (25%)', color: '#06b6d4', sortOrder: 1 },
          { name: '3. Дозвіл на роботу (~7 днів)', color: '#8b5cf6', sortOrder: 2 },
          { name: '4. Робоча віза D (25%)', color: '#f59e0b', sortOrder: 3 },
          { name: '5. Молдова ➔ Одеса (Транзит)', color: '#ec4899', sortOrder: 4 },
          { name: '6. Вихід на зміну (25%)', color: '#10b981', isWon: true, sortOrder: 5 }
        ]
      }
    },
    include: { stages: true }
  });

  // 3. Create Real Enterprise Companies from Slides
  const comp1 = await prisma.company.create({
    data: {
      name: 'ПрАТ «МХП Агро Холдинг»',
      phone: '+380 (44) 207-00-00',
      email: 'hr@mhp.com.ua',
      website: 'https://mhp.com.ua',
      address: 'Київська обл., м. Миронівка'
    }
  });

  const comp2 = await prisma.company.create({
    data: {
      name: 'ТОВ «Завод Віконних Систем Корса»',
      phone: '+380 (382) 78-90-00',
      email: 'production@korsa.ua',
      website: 'https://korsa.ua',
      address: 'м. Вінниця, вул. Промислова 12'
    }
  });

  const comp3 = await prisma.company.create({
    data: {
      name: 'ТОВ «Логістик Склад Експрес»',
      phone: '+380 (44) 390-12-34',
      email: 'logistics@express-hub.ua',
      website: 'https://express-hub.ua',
      address: 'м. Київ, Кільцева дорога 4'
    }
  });

  // 4. Create Contacts
  const cont1 = await prisma.contact.create({
    data: {
      name: 'Василь Григорович Мельник',
      companyId: comp1.id,
      phone: '+380734277174',
      whatsapp: '+380734277174',
      telegram: '@mhp_hr_director',
      email: 'v.melnyk@mhp.com.ua',
      position: 'HR-Директор виробничого комплексу'
    }
  });

  const cont2 = await prisma.contact.create({
    data: {
      name: 'Тетяна Олександрівна Коваль',
      companyId: comp2.id,
      phone: '+380509876543',
      whatsapp: '+380509876543',
      telegram: '@korsa_production',
      email: 't.koval@korsa.ua',
      position: 'Директор заводу'
    }
  });

  const cont3 = await prisma.contact.create({
    data: {
      name: 'Сергій Миколайович Бойко',
      companyId: comp3.id,
      phone: '+380674445566',
      whatsapp: '+380674445566',
      telegram: '@boyko_logistics',
      email: 's.boyko@express-hub.ua',
      position: 'Операційний директор складського комплексу'
    }
  });

  // 5. Create Sample Deals
  const salesStages = salesPipeline.stages;

  const deal1 = await prisma.deal.create({
    data: {
      title: 'ПрАТ «МХП» — Залучення 20 фасувальників та вантажників (Узбекистан)',
      budget: 22000, // 20 * €1100
      pipelineId: salesPipeline.id,
      stageId: salesStages[2].id, // КП
      responsibleId: 'usr-5', // Іван Соколов
      contactId: cont1.id,
      companyId: comp1.id,
      tags: JSON.stringify(['МХП', 'Агро', '20 осіб', 'Центральна Азія']),
      customFields: JSON.stringify({
        'Кількість персоналу': '20 осіб',
        'Профіль': 'Російськомовні (Центральна Азія)',
        'Бажана зарплата': '€900/міс',
        'Житло': 'Гуртожиток роботодавця',
        'Етапний платіж (25%)': '€5 500'
      })
    }
  });

  const deal2 = await prisma.deal.create({
    data: {
      title: 'Завод Корса — 10 зварювальників та операторів лінії (Індія)',
      budget: 10000, // 10 * €1000
      pipelineId: salesPipeline.id,
      stageId: salesStages[3].id, // Узгодження договору
      responsibleId: 'usr-6', // Марія Попова
      contactId: cont2.id,
      companyId: comp2.id,
      tags: JSON.stringify(['Виробництво вікон', '10 осіб', 'Індія']),
      customFields: JSON.stringify({
        'Кількість персоналу': '10 осіб',
        'Профіль': 'Англомовні (Індія)',
        'Зарплата': '€600/міс',
        'Етапний платіж (25%)': '€2 500'
      })
    }
  });

  const deal3 = await prisma.deal.create({
    data: {
      title: 'Логістик Склад — Пілотний проект на 5 комплектувальників',
      budget: 6000, // 5 * €1200
      pipelineId: salesPipeline.id,
      stageId: salesStages[1].id, // Дзвінок-кваліфікація
      responsibleId: 'usr-7', // Артем Новіков
      contactId: cont3.id,
      companyId: comp3.id,
      tags: JSON.stringify(['Склади', 'Пілот 5 осіб', 'Старт'])
    }
  });

  // 6. Create Tasks
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.task.create({
    data: {
      dealId: deal1.id,
      responsibleId: 'usr-5',
      createdById: 'usr-3',
      type: 'call',
      text: 'Презентувати КП Василю Григоровичу по схемі 4х25% на 20 робітників з Узбекистану',
      dueDate: tomorrow
    }
  });

  await prisma.task.create({
    data: {
      dealId: deal2.id,
      responsibleId: 'usr-6',
      createdById: 'usr-4',
      type: 'meeting',
      text: 'Узгодити проект договору та дату старту скринінгу кандидатів в Індії',
      dueDate: tomorrow
    }
  });

  // 7. Create Deal Notes & Messages
  await prisma.dealNote.create({
    data: {
      dealId: deal1.id,
      userId: 'usr-5',
      type: 'comment',
      content: 'Клієнт запитав щодо мовного бар\'єру. Пояснив, що кандидати з Узбекистану вільно володіють мовою з 1-го дня.'
    }
  });

  await prisma.chatMessage.create({
    data: {
      channel: 'whatsapp',
      direction: 'incoming',
      dealId: deal1.id,
      contactId: cont1.id,
      senderName: cont1.name,
      senderPhone: cont1.phone,
      text: 'Доброго дня, Іване! Отримали КП на 20 людей. Скажіть, скільки часу займе оформлення дозволів на роботу?'
    }
  });

  await prisma.chatMessage.create({
    data: {
      channel: 'whatsapp',
      direction: 'outgoing',
      dealId: deal1.id,
      contactId: cont1.id,
      senderPhone: cont1.phone,
      text: 'Доброго дня, Василю Григоровичу! Дозвіл на роботу у Держпраці оформлюється за ~7 робочих днів. Для старту потрібна лише копія паспорта та фото кандидата.'
    }
  });

  console.log('✅ Recruiting CRM successfully seeded with enterprise pipelines, candidates and deals!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
