import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CRM Database with 20 Users, Roles, Pipelines, and Data...');

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

  // 1. Create 20 Users with Granular Permissions
  const usersData = [
    {
      id: 'usr-1',
      name: 'Александр Громов',
      email: 'ceo@crm-online.pro',
      role: 'super_admin',
      department: 'Руководство',
      phone: '+7 (901) 111-00-01',
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
      name: 'Дмитрий Орлов',
      email: 'cto@crm-online.pro',
      role: 'tech_admin',
      department: 'IT / Интеграции',
      phone: '+7 (901) 111-00-02',
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
      name: 'Елена Смирнова',
      email: 'rop@crm-online.pro',
      role: 'sales_director',
      department: 'Отдел продаж',
      phone: '+7 (901) 111-00-03',
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
      name: 'Максим Кузнецов',
      email: 'teamlead.b2b@crm-online.pro',
      role: 'sales_teamlead_b2b',
      department: 'B2B Продажи',
      phone: '+7 (901) 111-00-04',
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
      name: 'Анна Васильева',
      email: 'teamlead.b2c@crm-online.pro',
      role: 'sales_teamlead_b2c',
      department: 'B2C Продажи',
      phone: '+7 (901) 111-00-05',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: true,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-6',
      name: 'Иван Соколов',
      email: 'senior.b2b@crm-online.pro',
      role: 'senior_sales_rep',
      department: 'B2B Продажи',
      phone: '+7 (901) 111-00-06',
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
      id: 'usr-7',
      name: 'Мария Попова',
      email: 'sales.b2b.1@crm-online.pro',
      role: 'sales_rep',
      department: 'B2B Продажи',
      phone: '+7 (901) 111-00-07',
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
      id: 'usr-8',
      name: 'Артем Новиков',
      email: 'sales.b2b.2@crm-online.pro',
      role: 'sales_rep',
      department: 'B2B Продажи',
      phone: '+7 (901) 111-00-08',
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
      id: 'usr-9',
      name: 'Ольга Федорова',
      email: 'senior.b2c@crm-online.pro',
      role: 'senior_sales_rep',
      department: 'B2C Продажи',
      phone: '+7 (901) 111-00-09',
      avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
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
      name: 'Кирилл Морозов',
      email: 'sales.b2c.1@crm-online.pro',
      role: 'sales_rep',
      department: 'B2C Продажи',
      phone: '+7 (901) 111-00-10',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: false,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-11',
      name: 'Дарья Волкова',
      email: 'sales.b2c.2@crm-online.pro',
      role: 'sales_rep',
      department: 'B2C Продажи',
      phone: '+7 (901) 111-00-11',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      canViewAllDeals: false,
      canViewDeptDeals: false,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    },
    {
      id: 'usr-12',
      name: 'Роман Алексеев',
      email: 'sdr.leadgen.1@crm-online.pro',
      role: 'lead_gen_sdr',
      department: 'Лидогенерация',
      phone: '+7 (901) 111-00-12',
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
      id: 'usr-13',
      name: 'Полина Семенова',
      email: 'sdr.leadgen.2@crm-online.pro',
      role: 'lead_gen_sdr',
      department: 'Лидогенерация',
      phone: '+7 (901) 111-00-13',
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
      id: 'usr-14',
      name: 'Сергей Лебедев',
      email: 'ltv.lead@crm-online.pro',
      role: 'account_teamlead',
      department: 'Сопровождение (LTV)',
      phone: '+7 (901) 111-00-14',
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
      id: 'usr-15',
      name: 'Виктория Козлова',
      email: 'ltv.manager@crm-online.pro',
      role: 'account_manager',
      department: 'Сопровождение (LTV)',
      phone: '+7 (901) 111-00-15',
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
      id: 'usr-16',
      name: 'Илья Павлов',
      email: 'support.lead@crm-online.pro',
      role: 'support_lead',
      department: 'Поддержка',
      phone: '+7 (901) 111-00-16',
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
      id: 'usr-17',
      name: 'Алина Егорова',
      email: 'support.agent@crm-online.pro',
      role: 'support_agent',
      department: 'Поддержка',
      phone: '+7 (901) 111-00-17',
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
      id: 'usr-18',
      name: 'Владислав Макаров',
      email: 'cmo.marketing@crm-online.pro',
      role: 'marketing_lead',
      department: 'Маркетинг',
      phone: '+7 (901) 111-00-18',
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
      id: 'usr-19',
      name: 'Татьяна Зайцева',
      email: 'finance@crm-online.pro',
      role: 'finance_manager',
      department: 'Финансы',
      phone: '+7 (901) 111-00-19',
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
      id: 'usr-20',
      name: 'Константин Белов',
      email: 'auditor@crm-online.pro',
      role: 'read_only_auditor',
      department: 'Аудит',
      phone: '+7 (901) 111-00-20',
      avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&auto=format&fit=crop&q=80',
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

  // 2. Create Pipelines and Stages
  const b2bPipeline = await prisma.pipeline.create({
    data: {
      name: 'B2B Корпоративные продажи',
      isDefault: true,
      sortOrder: 0,
      stages: {
        create: [
          { name: 'Неразобранное', color: '#64748b', sortOrder: 0 },
          { name: 'Первичный контакт', color: '#3b82f6', sortOrder: 1 },
          { name: 'Квалификация / Бриф', color: '#06b6d4', sortOrder: 2 },
          { name: 'Коммерческое предложение', color: '#f59e0b', sortOrder: 3 },
          { name: 'Согласование договора', color: '#8b5cf6', sortOrder: 4 },
          { name: 'Выставлен счет', color: '#ec4899', sortOrder: 5 },
          { name: 'Успешно реализовано', color: '#10b981', isWon: true, sortOrder: 6 },
          { name: 'Закрыто и не реализовано', color: '#ef4444', isLost: true, sortOrder: 7 }
        ]
      }
    },
    include: { stages: true }
  });

  const b2cPipeline = await prisma.pipeline.create({
    data: {
      name: 'B2C Быстрые продажи',
      isDefault: false,
      sortOrder: 1,
      stages: {
        create: [
          { name: 'Новая заявка', color: '#3b82f6', sortOrder: 0 },
          { name: 'Консультация в WhatsApp', color: '#10b981', sortOrder: 1 },
          { name: 'Оформление заказа', color: '#f59e0b', sortOrder: 2 },
          { name: 'Оплата получена', color: '#10b981', isWon: true, sortOrder: 3 },
          { name: 'Отказ клиента', color: '#ef4444', isLost: true, sortOrder: 4 }
        ]
      }
    },
    include: { stages: true }
  });

  const ltvPipeline = await prisma.pipeline.create({
    data: {
      name: 'LTV и Продление подписок',
      isDefault: false,
      sortOrder: 2,
      stages: {
        create: [
          { name: 'Онбординг клиента', color: '#3b82f6', sortOrder: 0 },
          { name: 'Активное использование', color: '#8b5cf6', sortOrder: 1 },
          { name: 'Продление тарифа', color: '#f59e0b', sortOrder: 2 },
          { name: 'Успешное продление', color: '#10b981', isWon: true, sortOrder: 3 },
          { name: 'Отток (Churn)', color: '#ef4444', isLost: true, sortOrder: 4 }
        ]
      }
    },
    include: { stages: true }
  });

  // 3. Create Companies
  const comp1 = await prisma.company.create({
    data: {
      name: 'ООО «ТехноСфера Инжиниринг»',
      phone: '+7 (495) 789-10-20',
      email: 'contact@technosphere.ru',
      website: 'https://technosphere.ru',
      address: 'г. Москва, Пресненская наб. 12, башня Федерация'
    }
  });

  const comp2 = await prisma.company.create({
    data: {
      name: 'АО «Альфа Логистик Групп»',
      phone: '+7 (812) 330-44-55',
      email: 'sales@alfalog.spb.ru',
      website: 'https://alfalog.spb.ru',
      address: 'г. Санкт-Петербург, Невский пр. 100'
    }
  });

  const comp3 = await prisma.company.create({
    data: {
      name: 'ИП «Вектор Плюс» (Сеть кофеен)',
      phone: '+7 (926) 555-12-34',
      email: 'vector.coffee@gmail.com',
      website: 'https://vector-coffee.ru',
      address: 'г. Казань, ул. Баумана 24'
    }
  });

  // 4. Create Contacts
  const cont1 = await prisma.contact.create({
    data: {
      name: 'Сергей Николаевич Мельников',
      companyId: comp1.id,
      phone: '+7 (916) 123-45-67',
      whatsapp: '+7 (916) 123-45-67',
      telegram: '@s_melnikov_tech',
      email: 's.melnikov@technosphere.ru',
      position: 'Генеральный директор'
    }
  });

  const cont2 = await prisma.contact.create({
    data: {
      name: 'Екатерина Романова',
      companyId: comp2.id,
      phone: '+7 (921) 987-65-43',
      whatsapp: '+7 (921) 987-65-43',
      telegram: '@katya_alfalog',
      email: 'k.romanova@alfalog.spb.ru',
      position: 'Директор по развитию'
    }
  });

  const cont3 = await prisma.contact.create({
    data: {
      name: 'Алексей Березин',
      companyId: comp3.id,
      phone: '+7 (903) 444-55-66',
      whatsapp: '+7 (903) 444-55-66',
      telegram: '@alex_berezin',
      email: 'alex@vector-coffee.ru',
      position: 'Основатель'
    }
  });

  const cont4 = await prisma.contact.create({
    data: {
      name: 'Анастасия Павлова',
      phone: '+7 (999) 888-11-22',
      whatsapp: '+7 (999) 888-11-22',
      telegram: '@anastasia_pavlova',
      email: 'anastasia.p@mail.ru',
      position: 'Частный клиент'
    }
  });

  // 5. Create Sample Deals across B2B Stages
  const b2bStages = b2bPipeline.stages;

  const deal1 = await prisma.deal.create({
    data: {
      title: 'Внедрение CRM в ТехноСфера (100 рабочих мест)',
      budget: 850000,
      pipelineId: b2bPipeline.id,
      stageId: b2bStages[3].id, // КП
      responsibleId: 'usr-6', // Иван Соколов
      contactId: cont1.id,
      companyId: comp1.id,
      tags: JSON.stringify(['Enterprise', 'Интеграция', 'B2B', 'Горячий']),
      customFields: JSON.stringify({
        'Количество лицензий': '100',
        'Срок реализации': '3 месяца',
        'Источник лида': 'Конференция 2026'
      })
    }
  });

  const deal2 = await prisma.deal.create({
    data: {
      title: 'Автоматизация логистического учета для Альфа Логистик',
      budget: 1450000,
      pipelineId: b2bPipeline.id,
      stageId: b2bStages[4].id, // Согласование договора
      responsibleId: 'usr-7', // Мария Попова
      contactId: cont2.id,
      companyId: comp2.id,
      tags: JSON.stringify(['Крупная сделка', 'Договор', 'WhatsApp']),
      customFields: JSON.stringify({
        'Юрист клиента': 'Одобрен',
        'Форма оплаты': '50/50'
      })
    }
  });

  const deal3 = await prisma.deal.create({
    data: {
      title: 'CRM для сети кофеен Вектор Плюс',
      budget: 320000,
      pipelineId: b2bPipeline.id,
      stageId: b2bStages[1].id, // Первичный контакт
      responsibleId: 'usr-8', // Артем Новиков
      contactId: cont3.id,
      companyId: comp3.id,
      tags: JSON.stringify(['HoReCa', 'Telegram'])
    }
  });

  const deal4 = await prisma.deal.create({
    data: {
      title: 'Консалтинг по продажам для Ритейл Групп',
      budget: 500000,
      pipelineId: b2bPipeline.id,
      stageId: b2bStages[6].id, // Успешно реализовано
      responsibleId: 'usr-4', // Максим Кузнецов
      contactId: cont1.id,
      companyId: comp1.id,
      tags: JSON.stringify(['Оплачено', 'VIP'])
    }
  });

  // 6. Create Tasks for Deals
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.task.create({
    data: {
      dealId: deal1.id,
      responsibleId: 'usr-6',
      createdById: 'usr-3',
      type: 'call',
      text: 'Позвонить Сергею Николаевичу и презентовать финальную смету КП',
      dueDate: tomorrow
    }
  });

  await prisma.task.create({
    data: {
      dealId: deal2.id,
      responsibleId: 'usr-7',
      createdById: 'usr-4',
      type: 'meeting',
      text: 'Встреча в Zoom с финансовым директором для подписания договора',
      dueDate: tomorrow
    }
  });

  // 7. Create Deal Notes & Timeline entries
  await prisma.dealNote.create({
    data: {
      dealId: deal1.id,
      userId: 'usr-6',
      type: 'comment',
      content: 'Клиент запросил скидку 5% при оплате 100% аванса. Согласовано с РОП.'
    }
  });

  await prisma.dealNote.create({
    data: {
      dealId: deal1.id,
      userId: 'usr-6',
      type: 'status_change',
      content: 'Сделка переведена на этап "Коммерческое предложение"'
    }
  });

  // 8. Create Sample WhatsApp & Telegram Messages
  await prisma.chatMessage.create({
    data: {
      channel: 'whatsapp',
      direction: 'incoming',
      dealId: deal1.id,
      contactId: cont1.id,
      senderName: cont1.name,
      senderPhone: cont1.phone,
      text: 'Добрый день, Иван! Получили ваше коммерческое предложение. Изучаем с директором по IT.'
    }
  });

  await prisma.chatMessage.create({
    data: {
      channel: 'whatsapp',
      direction: 'outgoing',
      dealId: deal1.id,
      contactId: cont1.id,
      senderPhone: cont1.phone,
      text: 'Отлично, Сергей Николаевич! Давайте запланируем звонок на завтра в 14:00, чтобы ответить на вопросы технических специалистов?'
    }
  });

  await prisma.chatMessage.create({
    data: {
      channel: 'telegram',
      direction: 'incoming',
      dealId: deal3.id,
      contactId: cont3.id,
      senderName: cont3.name,
      senderTgId: cont3.telegram,
      text: 'Привет! Интересует подключение WhatsApp для наших 5 кофеен, как это работает?'
    }
  });

  // 9. Create Automation Rules (Digital Pipeline)
  await prisma.automationRule.create({
    data: {
      pipelineId: b2bPipeline.id,
      stageId: b2bStages[1].id,
      triggerType: 'on_stage_enter',
      actionType: 'send_whatsapp',
      actionData: JSON.stringify({
        template: 'Здравствуйте, {client_name}! Спасибо за обращение. Ваш персональный менеджер {manager_name} уже приступил к расчету.'
      })
    }
  });

  await prisma.automationRule.create({
    data: {
      pipelineId: b2bPipeline.id,
      stageId: b2bStages[3].id,
      triggerType: 'on_stage_enter',
      actionType: 'create_task',
      actionData: JSON.stringify({
        taskType: 'call',
        taskText: 'Контроль получения КП: перезвонить клиенту через 24 часа',
        dueHours: 24
      })
    }
  });

  console.log('✅ CRM Database successfully seeded with 20 users, pipelines, deals, tasks, messages, and automations!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
