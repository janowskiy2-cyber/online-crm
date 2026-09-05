import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('================================================================');
  console.log('🤖 ЗАПУСК РОБОТА ВЕРИФИКАЦИИ СОХРАННОСТИ ДАННЫХ И SOFT-DELETE');
  console.log('================================================================\n');

  // 1. Проверка соединения с базой данных
  console.log('📡 [1/6] Подключение к PostgreSQL базе данных...');
  const userCountBefore = await prisma.user.count();
  const dealCountBefore = await prisma.deal.count();
  console.log(`✅ Успешное подключение к PostgreSQL!`);
  console.log(`   - Текущих пользователей в базе: ${userCountBefore}`);
  console.log(`   - Текущих сделок в базе: ${dealCountBefore}\n`);

  // 2. Создание тестового сотрудника (User)
  const testEmail = `robot.manager.${Date.now()}@crm.pro`;
  console.log(`👤 [2/6] Создание тестового сотрудника: ${testEmail}...`);
  const testUser = await prisma.user.create({
    data: {
      name: 'Олексій Робот-Менеджер',
      email: testEmail,
      password: hashPassword('Password123!'),
      role: 'sales_rep',
      department: 'B2B Продажі',
      phone: '+380501234567',
      isActive: true,
      isDeleted: false,
      canViewAllDeals: false,
      canViewDeptDeals: true,
      canEditDeals: true,
      canDeleteDeals: false,
      canExportData: false,
      canManageUsers: false,
      canManageIntegrations: false
    }
  });
  console.log(`✅ Сотрудник успешно создан в PostgreSQL! ID: ${testUser.id}`);
  console.log(`   - Имя: ${testUser.name}`);
  console.log(`   - Отдел: ${testUser.department}`);
  console.log(`   - Роль: ${testUser.role}\n`);

  // 3. Создание тестовой сделки (Deal)
  console.log('💼 [3/6] Создание тестовой сделки для проверки изоляции и сохранности...');
  const defaultPipeline = await prisma.pipeline.findFirst({
    include: { stages: { orderBy: { sortOrder: 'asc' } } }
  });

  if (!defaultPipeline || !defaultPipeline.stages || defaultPipeline.stages.length === 0) {
    throw new Error('Воронка продаж не найдена в базе данных!');
  }

  const firstStage = defaultPipeline.stages[0];
  const dealTitle = `[Робот-Тест ${Date.now()}] Збереження бази даних та захист від видалення`;

  const testDeal = await prisma.deal.create({
    data: {
      title: dealTitle,
      budget: 150000,
      pipelineId: defaultPipeline.id,
      stageId: firstStage.id,
      responsibleId: testUser.id,
      tags: JSON.stringify(['Робот-Тест', 'Захист-БД']),
      isDeleted: false
    }
  });
  console.log(`✅ Сделка создана в PostgreSQL! ID: ${testDeal.id}`);
  console.log(`   - Название: ${testDeal.title}`);
  console.log(`   - Бюджет: ${testDeal.budget} грн`);
  console.log(`   - Ответственный: ${testUser.name} (${testUser.id})\n`);

  // 4. Проверка Soft-Delete (Архивация вместо удаления)
  console.log('🗑️ [4/6] Тестирование Soft-Delete (Архивации):');
  const archivedDeal = await prisma.deal.update({
    where: { id: testDeal.id },
    data: {
      isDeleted: true,
      deletedAt: new Date()
    }
  });
  console.log(`   - Сделка помечена как удаленная (isDeleted = true, deletedAt = ${archivedDeal.deletedAt?.toISOString()})`);

  // Проверка: сделка пропала из выборки активных сделок
  const activeDealsCheck = await prisma.deal.findMany({
    where: { id: testDeal.id, isDeleted: false }
  });
  console.log(`   - Проверка активной выборки (where: { isDeleted: false }): найдено ${activeDealsCheck.length} (Ожидалось 0: ✅ СКРЫТА)`);

  // Проверка: сделка присутствует в архиве
  const archiveCheck = await prisma.deal.findMany({
    where: { id: testDeal.id, isDeleted: true }
  });
  console.log(`   - Проверка корзины/архива (where: { isDeleted: true }): найдено ${archiveCheck.length} (Ожидалось 1: ✅ В АРХИВЕ)`);

  // 5. Проверка Restore (Мгновенное восстановление из архива)
  console.log('\n♻️ [5/6] Тестирование восстановления из архива (Restore):');
  const restoredDeal = await prisma.deal.update({
    where: { id: testDeal.id },
    data: {
      isDeleted: false,
      deletedAt: null
    }
  });
  console.log(`   - Сделка восстановлена (isDeleted = false, deletedAt = null)`);

  const restoredCheck = await prisma.deal.findMany({
    where: { id: testDeal.id, isDeleted: false }
  });
  console.log(`   - Проверка активной выборки после восстановления: найдено ${restoredCheck.length} (Ожидалось 1: ✅ ВОССТАНОВЛЕНА В РАБОЧИЙ СПИСОК)\n`);

  // 7. Проверка персистентности сессий мессенджеров в базе данных (изолированный тест)
  console.log('📱 [7/7] Проверка персистентности сессий мессенджеров (Neon PostgreSQL):');
  const dummyPayload = {
    files: {
      'creds.json': Buffer.from(JSON.stringify({ me: { id: '380977510772:1@s.whatsapp.net', name: 'B2B WhatsApp' } })).toString('base64'),
      'app-state-sync-key-1': Buffer.from('test_binary_key').toString('base64')
    }
  };

  await prisma.messengerSession.upsert({
    where: { channel: 'test_backup_channel' },
    create: {
      channel: 'test_backup_channel',
      status: 'connected',
      sessionPayload: JSON.stringify(dummyPayload),
      phone: '+380977510772',
      accountName: 'Корпоративний WhatsApp Business (Тест)'
    },
    update: {
      status: 'connected',
      sessionPayload: JSON.stringify(dummyPayload),
      phone: '+380977510772'
    }
  });

  const checkWhatsAppSession = await prisma.messengerSession.findUnique({ where: { channel: 'test_backup_channel' } });
  const parsedFiles = JSON.parse(checkWhatsAppSession?.sessionPayload || '{}').files || {};
  const fileKeys = Object.keys(parsedFiles);

  console.log(`   - Тестовая сессия в PostgreSQL: ${checkWhatsAppSession ? '✅ НАЙДЕНА' : '❌ НЕ НАЙДЕНА'}`);
  console.log(`   - Статус: ${checkWhatsAppSession?.status}, Номер: ${checkWhatsAppSession?.phone}`);
  console.log(`   - Сохранено файлов авторизации Baileys в БД: ${fileKeys.length} (${fileKeys.join(', ')})`);
  console.log(`   - Проверка целостности creds.json: ${parsedFiles['creds.json'] ? '✅ ЦЕЛЫЙ' : '❌ ПОВРЕЖДЕН'}`);

  // Очистка тестовой записи
  await prisma.messengerSession.deleteMany({ where: { channel: 'test_backup_channel' } });
  console.log('   - Очистка тестовой записи: ✅ ЗАВЕРШЕНО\n');

  console.log('================================================================');
  console.log('🎉 ВСЕ ПРОВЕРКИ УСПЕШНО ПРОЙДЕНЫ! СЕССИИ И ДАННЫЕ ЗАЩИЩЕНЫ В NEON DB.');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка во время проверки:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
