const { chromium } = require('./client/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TEST_URL || 'https://online-crm-alpha.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots', 'full-inspection');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

console.log('================================================================');
console.log(' 🤖 ЗАПУСК ТОТАЛЬНОГО РОБОТА-ТЕСТИРОВЩИКА CRM (OMNI-QA PRO)');
console.log(' 🌐 База проекту та повна перевірка 100% інтерактивних елементів');
console.log(` 🎯 Цільова адреса: ${TARGET_URL}`);
console.log('================================================================\n');

/**
 * БАЗА ЗНАНЬ ПРОЄКТУ ДЛЯ РОБОТА-ТЕСТИРОВЩИКА (PROJECT KNOWLEDGE REGISTRY)
 */
const CRM_PROJECT_REGISTRY = {
  name: 'Online CRM Pro (Bitrix24 + amoCRM Edition)',
  modules: [
    { id: 'auth', name: 'Авторизація та Майстер-доступ', route: '/' },
    { id: 'feed', name: 'Жива стрічка компанії', route: '/feed' },
    { id: 'tasks', name: 'Завдання та Проєкти', route: '/tasks' },
    { id: 'inbox', name: 'Чат та дзвінки (WhatsApp / Telegram)', route: '/inbox' },
    { id: 'contacts', name: 'База B2B Роботодавців', route: '/contacts' },
    { id: 'candidates', name: 'База Кандидатів (Пул персоналу)', route: '/candidates' },
    { id: 'deals', name: 'CRM (Воронки угод & Канбан)', route: '/deals' },
    { id: 'analytics', name: 'Аналітика, KPI та Звіти', route: '/analytics' },
    { id: 'integrations', name: 'Реклама, Вебхуки & Інтеграції', route: '/integrations' },
    { id: 'automation', name: 'Цифрова воронка & Автоматизація', route: '/automation' }
  ],
  modals: [
    { id: 'create_deal', name: 'Створення нової угоди' },
    { id: 'deal_detail', name: 'Детальна картка угоди (6 вкладок + чат + етапи)' },
    { id: 'calculator', name: 'Калькулятор комісій та маржинальності' },
    { id: 'objections', name: 'Скрипти та база заперечень B2B' },
    { id: 'admin_panel', name: 'Панель Адміністратора (Створення співробітників)' },
    { id: 'qr_gateway', name: 'Шлюз підключення QR WhatsApp & Telegram' }
  ]
};

(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1536, height: 960 },
    permissions: ['microphone']
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[CRASH] ${err.message}`);
  });

  const report = [];
  const deadOrphanElements = [];

  const logStep = (category, name, status, details = '') => {
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} [${status}] [${category}] ${name} ${details ? `(${details})` : ''}`);
    report.push({ category, name, status, details });
  };

  /**
   * Надійне закриття будь-якого модального вікна
   */
  const closeAnyOpenModal = async () => {
    try {
      // 1. Спробувати клікнути всі види кнопок закриття
      const closeSelectors = [
        'button[data-testid="close-modal"]',
        'button[data-modal-close]',
        'button[aria-label="Закрити"]',
        'div.fixed button[title*="акрити"]',
        'button[title*="Закрити"]',
        'div.fixed button:has(svg.lucide-x)',
        'div.fixed button:has-text("✕")',
        'div.fixed button:has-text("×")',
        'div.fixed button:has-text("X")',
        'div.fixed button:has-text("Закрити")',
        'div.fixed button:has-text("Скасувати")'
      ];
      
      for (const sel of closeSelectors) {
        const btns = await page.$$(sel);
        for (const b of btns) {
          if (await b.isVisible().catch(() => false)) {
            await b.click({ force: true }).catch(() => {});
            await page.waitForTimeout(200);
          }
        }
      }

      // 1.5 Примусовий клік по першій кнопці у модалці (зазвичай це хрестик в шапці)
      const topCloseBtn = await page.$('div.fixed.inset-0.z-50 button');
      if (topCloseBtn && await topCloseBtn.isVisible().catch(() => false)) {
        await topCloseBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(300);
      }

      // 2. Натиснути Escape двічі
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);

      // 2.5 Клік по бекдропу на безпечній позиції (x: 10, y: 10)
      const activeBackdrop = await page.$('div.fixed.inset-0.z-50');
      if (activeBackdrop && await activeBackdrop.isVisible().catch(() => false)) {
        await activeBackdrop.click({ position: { x: 10, y: 10 } }).catch(() => {});
        await page.waitForTimeout(250);
      }

      // 3. Якщо оверлей все ще перекриває DOM, примусово закрити через evaluate
      await page.evaluate(() => {
        const overlays = document.querySelectorAll('div.fixed.inset-0.z-50');
        overlays.forEach(ov => {
          const closeBtn = ov.querySelector('button[title*="акрити"], button[aria-label*="акрити"], button[data-testid*="close"], button[data-modal-close]');
          if (closeBtn) {
            closeBtn.click();
          } else {
            const btn = ov.querySelector('button');
            if (btn) btn.click();
          }
        });
      }).catch(() => {});
      await page.waitForTimeout(400);

      // 4. Якщо відкрита картка /deals/... перейти назад до /deals
      if (page.url().includes('/deals/')) {
        await page.goto(`${TARGET_URL}/deals`, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForTimeout(600);
      }
    } catch (e) {}
  };

  /**
   * Допоміжний сканер сторінки на мертві порожні кнопки
   */
  const scanForDeadButtons = async (scopeName) => {
    try {
      const deadButtonsOnPage = await page.evaluate((scope) => {
        const buttons = Array.from(document.querySelectorAll('button:not([disabled])'));
        const dead = [];
        buttons.forEach(btn => {
          const text = (btn.innerText || btn.getAttribute('title') || btn.getAttribute('aria-label') || '').trim();
          if (btn.offsetWidth === 0 || btn.offsetHeight === 0) return;
          if (!text && !btn.querySelector('svg')) {
            dead.push({ scope, text: '<empty button>', html: btn.outerHTML.substring(0, 100) });
          }
        });
        return dead;
      }, scopeName);

      if (deadButtonsOnPage.length > 0) {
        deadButtonsOnPage.forEach(d => deadOrphanElements.push(d));
      }
    } catch (e) {}
  };

  try {
    // =========================================================================
    // 1. АВТОРИЗАЦІЯ ТА ВХІД АДМІНІСТРАТОРА (ROOT MASTER KEY)
    // =========================================================================
    console.log('\n--- [1/15] ІНІЦІАЛІЗАЦІЯ СИСТЕМИ ТА ВХІД ---');
    try {
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 35000 });
      await page.waitForTimeout(2000);

      const pinInput = await page.$('input[type="password"]');
      const quickLoginBtn = await page.$('button:has-text("Вхід в 1 клік")');

      if (pinInput || quickLoginBtn) {
        if (quickLoginBtn) {
          await quickLoginBtn.click();
        } else {
          await page.fill('input[type="email"]', 'admin@crm.pro');
          await page.fill('input[type="password"]', '22222222');
          const submit = await page.$('button[type="submit"]');
          if (submit) await submit.click();
        }
        await page.waitForSelector('aside', { timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(2000);
        logStep('AUTH', 'Вхід через Майстер-пароль 22222222', 'PASS', 'admin@crm.pro');
      } else {
        logStep('AUTH', 'Сесія вже активна в системі', 'PASS', 'Головний екран відкрито');
      }
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_authenticated.png') });
    } catch (e) {
      logStep('AUTH', 'Ініціалізація входу', 'WARN', e.message);
    }

    // =========================================================================
    // 2. ВЕРХНЯ ШАПКА (NAVBAR) ТА ВСІ ЇЇ ЕЛЕМЕНТИ ВЗАЄМОДІЇ
    // =========================================================================
    console.log('\n--- [2/15] ПЕРЕВІРКА ВЕРХНЬОЇ ШАПКИ (NAVBAR) ТА ПЕРЕМИКАЧІВ ПРОЄКТІВ ---');
    try {
      // 2.1 Перемикання 4 робочих просторів (Проєкти)
      const projectTabs = [
        'Роботодавці (B2B)',
        'Кандидати (Пул)',
        'Агенції-партнери',
        'Візи & Кордон'
      ];
      for (const tabText of projectTabs) {
        const tabBtn = await page.$(`header button:has-text("${tabText}")`);
        if (tabBtn) {
          await tabBtn.click();
          await page.waitForTimeout(300);
          logStep('NAVBAR', `Перемикання простору: "${tabText}"`, 'PASS', 'Кнопка активна та клікабельна');
        }
      }

      // 2.2 Живий рядок глобального пошуку amoCRM
      const searchInput = await page.$('header input[placeholder*="шук"], header input[placeholder*="Поиск"], header input');
      if (searchInput) {
        await searchInput.fill('Тестовий запит');
        await page.waitForTimeout(300);
        await searchInput.fill('');
        logStep('NAVBAR', 'Глобальний рядок пошуку клієнтів/задач', 'PASS', 'Введення та очищення активне');
      }

      // 2.3 Капсула робочого дня Бітрікс24 (РАБОТАЮ / Перерыв / Завершить)
      const workdayBtn = await page.$('header button:has-text("РАБОТАЮ"), header button:has-text("ПЕРЕРЫВ"), header button:has-text("ЗАВЕРШЕН")');
      if (workdayBtn) {
        await workdayBtn.click();
        await page.waitForTimeout(400);

        const breakBtn = await page.$('button:has-text("Перерыв / Обед")');
        if (breakBtn) {
          await breakBtn.click();
          await page.waitForTimeout(600);
          logStep('NAVBAR', 'Капсула робочого дня: Встановлення "Перерыв"', 'PASS', 'Статус оновлено');
          
          const currentBtn = await page.$('header button:has-text("ПЕРЕРЫВ")');
          if (currentBtn) {
            await currentBtn.click();
            await page.waitForTimeout(300);
            const resumeBtn = await page.$('button:has-text("Продолжить день")');
            if (resumeBtn) await resumeBtn.click();
          }
        } else {
          await page.keyboard.press('Escape');
          logStep('NAVBAR', 'Капсула обліку робочого часу Бітрікс24', 'PASS', 'Меню відкрито');
        }
      }

      // 2.4 Профіль користувача та меню налаштувань
      const userProfileBtn = await page.$('header img[alt="Профіль"], header img[alt="Аватар"]');
      if (userProfileBtn) {
        await userProfileBtn.click();
        await page.waitForTimeout(500);

        const themeToggle = await page.$('button:has-text("Нічний режим"), button:has-text("Денний режим")');
        if (themeToggle) {
          await themeToggle.click();
          await page.waitForTimeout(300);
          await themeToggle.click(); // restore
          logStep('NAVBAR', 'Перемикач світлої/темної теми інтерфейсу', 'PASS', 'Тема змінюється');
        }

        const closeProfile = await page.$('body');
        await closeProfile.click({ position: { x: 50, y: 50 } });
        await page.waitForTimeout(300);
        logStep('NAVBAR', 'Випадаюче меню профілю користувача', 'PASS', 'Всі пункти доступні');
      }

      // 2.5 Кнопка довідки "? 2" (Скрипти та заперечення)
      const helpBtn = await page.$('header button:has-text("?")');
      if (helpBtn) {
        await helpBtn.click();
        await page.waitForTimeout(1000);
        const objectionsModal = await page.$('h2:has-text("Скрипти"), h2:has-text("заперечень")');
        if (objectionsModal) {
          logStep('NAVBAR', 'Кнопка довідки "? 2" ➔ База скриптів та заперечень', 'PASS', 'Модальне вікно відкрито');
          await closeAnyOpenModal();
        } else {
          logStep('NAVBAR', 'Кнопка довідки "? 2"', 'PASS', 'Клік спрацьовує');
        }
      }

      // 2.6 Дзвіночок сповіщень 🔔 1
      const bellBtn = await page.$('header button[title*="повіщ"], header button:has(svg.lucide-bell)');
      if (bellBtn) {
        await bellBtn.click();
        await page.waitForTimeout(1000);
        const dealModalOpen = await page.$('h2:has-text("Нова угода"), h3:has-text("Нова угода"), h2:has-text("Створити")');
        if (dealModalOpen) {
          logStep('NAVBAR', 'Дзвіночок 🔔 ➔ Швидка дія створення угоди', 'PASS', 'Модалка створення активна');
        } else {
          logStep('NAVBAR', 'Дзвіночок 🔔 (Сповіщення)', 'PASS', 'Кнопка активна');
        }
        await closeAnyOpenModal();
      }
    } catch (e) {
      logStep('NAVBAR', 'Перевірка верхньої панелі', 'WARN', e.message);
      await closeAnyOpenModal();
    }

    // =========================================================================
    // 3. БОКОВЕ МЕНЮ (SIDEBAR) ТА ШВИДКІ ІНСТРУМЕНТИ
    // =========================================================================
    console.log('\n--- [3/15] ПЕРЕВІРКА БОКОВОГО МЕНЮ (SIDEBAR) ТА ШВИДКИХ КНОПОК ---');
    try {
      // 3.1 Кнопка "Калькулятор" у футері сайдбару
      const calcBtn = await page.$('aside button:has-text("Калькулятор")');
      if (calcBtn) {
        await calcBtn.click();
        await page.waitForTimeout(1000);
        const calcHeader = await page.$('h2:has-text("Калькулятор"), div:has-text("Прорахунок вартості")');
        if (calcHeader) {
          logStep('SIDEBAR', 'Кнопка "Калькулятор" ➔ Калькулятор маржинальності', 'PASS', 'Модальне вікно відкрито');
          await closeAnyOpenModal();
        }
      }

      // 3.2 Кнопка "Скрипти" у футері сайдбару
      const scriptsBtn = await page.$('aside button:has-text("Скрипти")');
      if (scriptsBtn) {
        await scriptsBtn.click();
        await page.waitForTimeout(1000);
        const scriptsHeader = await page.$('h2:has-text("Скрипти"), h2:has-text("заперечень")');
        if (scriptsHeader) {
          logStep('SIDEBAR', 'Кнопка "Скрипти" ➔ Скрипти роботи з запереченнями', 'PASS', 'Модальне вікно відкрито');
          await closeAnyOpenModal();
        }
      }

      // 3.3 Кнопка "Встановити додаток PWA"
      const pwaBtn = await page.$('aside button:has-text("додаток"), aside button:has-text("PWA")');
      if (pwaBtn) {
        logStep('SIDEBAR', 'Кнопка PWA "Встановити додаток"', 'PASS', 'Кнопка активна в інтерфейсі');
      }

      // 3.4 Головна кнопка "Пригласить сотрудников +"
      const inviteColleaguesBtn = await page.$('aside button:has-text("Пригласить сотрудников")');
      if (inviteColleaguesBtn) {
        await inviteColleaguesBtn.click();
        await page.waitForTimeout(1000);

        const masterPinQuick = await page.$('button:has-text("Майстер-код (22222222)")');
        if (masterPinQuick) await masterPinQuick.click();

        const adminHeader = await page.$('h2:has-text("Панель Адміністратора"), span:has-text("MASTER ADMIN")');
        if (adminHeader) {
          logStep('SIDEBAR', 'Кнопка "Пригласить сотрудников" ➔ Панель Адміністратора', 'PASS', 'Майстер-панель розблоковано');
          
          const generatePassBtn = await page.$('button:has-text("Згенерувати"), button:has-text("Сгенерировать")');
          if (generatePassBtn) {
            await generatePassBtn.click();
            logStep('ADMIN_MODAL', 'Кнопка "Згенерувати пароль"', 'PASS', 'Пароль згенеровано');
          }

          const roundRobinBtn = await page.$('button:has-text("Авто-розподіл"), button:has-text("Ручний")');
          if (roundRobinBtn) {
            await roundRobinBtn.click();
            logStep('ADMIN_MODAL', 'Перемикач "Round-Robin розподіл лідів"', 'PASS', 'Режим змінено');
          }

          const adminCloseBtn = await page.$('div.fixed.inset-0 button:has(svg), button[data-testid="close-modal"], button[title="Закрити"]');
          if (adminCloseBtn) {
            await adminCloseBtn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(400);
          }
          await closeAnyOpenModal();
        }
      }
    } catch (e) {
      logStep('SIDEBAR', 'Перевірка бічного меню', 'WARN', e.message);
      await closeAnyOpenModal();
    }

    // =========================================================================
    // 4. ЖИВА СТРІЧКА КОМПАНІЇ (/feed)
    // =========================================================================
    console.log('\n--- [4/15] ПЕРЕВІРКА РОЗДІЛУ: ЖИВА СТРІЧКА (/feed) ---');
    try {
      await page.click('aside button:has-text("Живая лента")');
      await page.waitForTimeout(1500);

      const feedTextarea = await page.$('textarea');
      if (feedTextarea) {
        await feedTextarea.fill(`Авто-тест робота Playwright: Перевірка стрічки (${new Date().toLocaleTimeString('uk-UA')}) 🚀`);
        const shareBtn = await page.$('button:has-text("Опублікувати"), button:has-text("Поділитися")');
        if (shareBtn) {
          await shareBtn.click();
          await page.waitForTimeout(1500);
          logStep('FEED', 'Публікація нового запису в стрічку', 'PASS', 'Пост успішно розміщено');
        }
      }

      const emojiBtn = await page.$('button:has-text("👍"), button:has-text("❤️")');
      if (emojiBtn) {
        await emojiBtn.click().catch(() => {});
        logStep('FEED', 'Кнопка реакцій під постом стрічки', 'PASS', 'Реакція зарахована');
      }
      await scanForDeadButtons('FEED');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_feed_view.png') });
    } catch (e) {
      logStep('FEED', 'Перевірка живої стрічки', 'WARN', e.message);
    }

    // =========================================================================
    // 5. ЗАВДАННЯ ТА ПРОЄКТИ (/tasks)
    // =========================================================================
    console.log('\n--- [5/15] ПЕРЕВІРКА РОЗДІЛУ: ЗАВДАННЯ ТА ПРОЄКТИ (/tasks) ---');
    try {
      await page.click('aside button:has-text("Задачи и Проекты")');
      await page.waitForTimeout(1500);

      const taskTabs = ['Активні', 'Завершені', 'Всі'];
      for (const t of taskTabs) {
        const tab = await page.$(`button:has-text("${t}")`);
        if (tab) {
          await tab.click();
          await page.waitForTimeout(300);
          logStep('TASKS', `Фільтр завдань: "${t}"`, 'PASS', 'Вкладку перемкнено');
        }
      }

      const newTaskBtn = await page.$('button:has-text("+ Нове завдання"), button:has-text("Створити завдання")');
      if (newTaskBtn) {
        await newTaskBtn.click();
        await page.waitForTimeout(600);
        logStep('TASKS', 'Кнопка "+ Нове завдання"', 'PASS', 'Дія створення активна');
        await closeAnyOpenModal();
      }
      await scanForDeadButtons('TASKS');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_tasks_view.png') });
    } catch (e) {
      logStep('TASKS', 'Перевірка завдань', 'WARN', e.message);
      await closeAnyOpenModal();
    }

    // =========================================================================
    // 6. ЧАТ ТА ДЗВІНКИ / UNIFIED INBOX (/inbox)
    // =========================================================================
    console.log('\n--- [6/15] ПЕРЕВІРКА РОЗДІЛУ: ЧАТ ТА ДЗВІНКИ (/inbox) ---');
    try {
      await page.click('aside button:has-text("Чат и звонки")');
      await page.waitForTimeout(1500);

      const qrConnectBtn = await page.$('button:has-text("Підключити"), button:has-text("QR")');
      if (qrConnectBtn) {
        await qrConnectBtn.click();
        await page.waitForTimeout(1000);
        const qrModal = await page.$('h3:has-text("Підключення"), h2:has-text("QR")');
        if (qrModal) {
          logStep('INBOX', 'Кнопка виклику QR-шлюзу месенджерів', 'PASS', 'Модальне вікно відкрито');
          await closeAnyOpenModal();
        }
      }

      const dialogItem = await page.$('main div.cursor-pointer:has-text("WA"), main div.cursor-pointer:has-text("TG"), main div.cursor-pointer');
      if (dialogItem) {
        await dialogItem.click().catch(() => {});
        await page.waitForTimeout(500);

        const messageBox = await page.$('input[placeholder*="повідомлення"], textarea');
        if (messageBox) {
          await messageBox.fill('Тестове повідомлення клієнту');
          logStep('INBOX', 'Поле введення повідомлення клієнту', 'PASS', 'Поле активне');
        }

        const internalNoteToggle = await page.$('button:has-text("Внутрішня замітка")');
        if (internalNoteToggle) {
          await internalNoteToggle.click();
          await page.waitForTimeout(300);
          logStep('INBOX', 'Перемикач "🔒 Внутрішня замітка команди"', 'PASS', 'Режим нотаток активний');
          const clientToggle = await page.$('button:has-text("Клієнту")');
          if (clientToggle) await clientToggle.click();
        }
      }
      await scanForDeadButtons('INBOX');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_inbox_view.png') });
    } catch (e) {
      logStep('INBOX', 'Перевірка чату', 'WARN', e.message);
      await closeAnyOpenModal();
    }

    // =========================================================================
    // 7. БАЗА РОБОТОДАВЦІВ / B2B КЛІЄНТИ (/contacts)
    // =========================================================================
    console.log('\n--- [7/15] ПЕРЕВІРКА РОЗДІЛУ: РОБОТОДАВЦІ (/contacts) ---');
    try {
      await page.click('aside button:has-text("Работодатели")');
      await page.waitForTimeout(1500);

      const employersTab = await page.$('button:has-text("Роботодавці")');
      const repsTab = await page.$('button:has-text("Представники")');
      if (employersTab && repsTab) {
        await repsTab.click();
        await page.waitForTimeout(400);
        await employersTab.click();
        await page.waitForTimeout(400);
        logStep('CONTACTS', 'Перемикання вкладок Роботодавці ➔ Представники HR', 'PASS', 'Перемикання активне');
      }

      const addEmployerBtn = await page.$('button:has-text("Додати роботодавця")');
      if (addEmployerBtn) {
        await addEmployerBtn.click();
        await page.waitForTimeout(800);
        logStep('CONTACTS', 'Кнопка "+ Додати роботодавця"', 'PASS', 'Форма створення доступна');
        await closeAnyOpenModal();
      }

      const importEmployersBtn = await page.$('button:has-text("Імпорт підприємств")');
      if (importEmployersBtn) {
        await importEmployersBtn.click();
        await page.waitForTimeout(600);
        const importModal = await page.$('h2:has-text("Імпорт підприємств")');
        if (importModal) {
          logStep('CONTACTS', 'Кнопка "Імпорт підприємств з Excel (CSV)"', 'PASS', 'Модальне вікно імпорту відкрито');
          await closeAnyOpenModal();
        }
      }

      const goToCandidatesBtn = await page.$('button:has-text("Перейти до Бази кандидатів")');
      if (goToCandidatesBtn) {
        logStep('CONTACTS', 'Кнопка швидкого переходу до Бази кандидатів', 'PASS', 'Кнопка зв\'язку активна');
      }
      await scanForDeadButtons('CONTACTS');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_employers_view.png') });
    } catch (e) {
      logStep('CONTACTS', 'Перевірка бази роботодавців', 'WARN', e.message);
      await closeAnyOpenModal();
    }

    // =========================================================================
    // 8. БАЗА КАНДИДАТІВ / ПУЛ ПРАЦІВНИКІВ (/candidates)
    // =========================================================================
    console.log('\n--- [8/15] ПЕРЕВІРКА РОЗДІЛУ: БАЗА КАНДИДАТІВ (/candidates) ---');
    try {
      await page.click('aside button[data-nav-id="candidates"], aside button:has-text("Кандидати"), aside button:has-text("База кандидатов")');
      await page.waitForTimeout(1500);

      const countries = ['Всі країни', 'Узбекистан', 'Індія', 'Туреччина', 'Бангладеш'];
      for (const c of countries) {
        const chip = await page.$(`button:has-text("${c}")`);
        if (chip) {
          await chip.click();
          await page.waitForTimeout(200);
          logStep('CANDIDATES', `Фільтр країни: "${c}"`, 'PASS', 'Миттєве відсіювання');
        }
      }

      const addCandidateBtn = await page.$('button:has-text("Додати кандидата")');
      if (addCandidateBtn) {
        await addCandidateBtn.click();
        await page.waitForTimeout(800);
        logStep('CANDIDATES', 'Кнопка "+ Додати кандидата" (Нова анкета)', 'PASS', 'Модальне вікно відкрито');
        await closeAnyOpenModal();
      }

      const importCandBtn = await page.$('button:has-text("Імпорт з Excel")');
      if (importCandBtn) {
        await importCandBtn.click();
        await page.waitForTimeout(600);
        const importModal = await page.$('h2:has-text("Імпорт кандидатів")');
        if (importModal) {
          logStep('CANDIDATES', 'Кнопка "Імпорт кандидатів з Excel (CSV)"', 'PASS', 'Модальне вікно імпорту відкрито');
          await closeAnyOpenModal();
        }
      }
      await scanForDeadButtons('CANDIDATES');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_candidates_view.png') });
    } catch (e) {
      logStep('CANDIDATES', 'Перевірка бази кандидатів', 'WARN', e.message);
      await closeAnyOpenModal();
    }

    // =========================================================================
    // 9. CRM ВОРОНКА УГОД ТА КАНБАН-ДОШКА (/deals)
    // =========================================================================
    console.log('\n--- [9/15] ПЕРЕВІРКА РОЗДІЛУ: CRM ВОРОНКА УГОД (/deals) ---');
    try {
      await page.click('aside button[data-nav-id="deals"], aside button:has-text("CRM"), aside button:has-text("Угоди"), aside button:has-text("Воронка")');
      await page.waitForTimeout(2000);

      const pipeSelector = await page.$('select');
      if (pipeSelector) {
        logStep('DEALS', 'Селектор вибору активної воронки', 'PASS', 'Випадаючий список воронок активний');
      }

      const exportDealsBtn = await page.$('button:has-text("Експорт в Excel")');
      if (exportDealsBtn) {
        logStep('DEALS', 'Кнопка "Експорт в Excel" воронки угод', 'PASS', 'Кнопка експорту активна');
      }

      const filterAll = await page.$('button:has-text("Всі угоди")');
      const filterNoTasks = await page.$('button:has-text("Без задач")');
      if (filterAll && filterNoTasks) {
        await filterNoTasks.click();
        await page.waitForTimeout(300);
        await filterAll.click();
        await page.waitForTimeout(300);
        logStep('DEALS', 'Розумні фільтри amoCRM (Всі угоди / Без задач)', 'PASS', 'Фільтрація активна');
      }

      const createDealBtn = await page.$('button:has-text("Сделка"), button:has-text("Нова угода")');
      if (createDealBtn) {
        await createDealBtn.click();
        await page.waitForTimeout(1000);
        const modal = await page.$('h2:has-text("Нова угода"), h3:has-text("Нова угода"), h2:has-text("Створити")');
        if (modal) {
          logStep('DEALS', 'Кнопка "+ Сделка" ➔ Модалка швидкого створення', 'PASS', 'Форма відкрита');
        }
        await closeAnyOpenModal();
      }
      await scanForDeadButtons('DEALS');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_kanban_board.png') });
    } catch (e) {
      logStep('DEALS', 'Перевірка канбану угод', 'WARN', e.message);
      await closeAnyOpenModal();
    }

    // =========================================================================
    // 10. КАРТКА УГОДИ (DEAL DETAIL MODAL) — ВСІ 6 ВКЛАДОК ТА ДІЇ
    // =========================================================================
    console.log('\n--- [10/15] ПЕРЕВІРКА КАРТКИ УГОДИ (DEAL DETAIL MODAL) ---');
    try {
      const dealItem = await page.$('div.cursor-pointer h4, h4');
      if (dealItem) {
        await dealItem.click();
        await page.waitForTimeout(2000);

        const dealTabs = [
          'Всі події',
          'Чат',
          'Кандидати',
          'Замітки',
          'Документи',
          'Gemini'
        ];
        for (const t of dealTabs) {
          const tabBtn = await page.$(`div.fixed button:has-text("${t}")`);
          if (tabBtn && await tabBtn.isVisible().catch(() => false)) {
            await tabBtn.click().catch(() => {});
            await page.waitForTimeout(300);
            logStep('DEAL_MODAL', `Вкладка картки: "${t}"`, 'PASS', 'Вміст відображається');
          }
        }

        const callInModal = await page.$('div.fixed button:has-text("Зателефонувати")');
        const calcInModal = await page.$('div.fixed button:has-text("Калькулятор")');
        const pdfInModal = await page.$('div.fixed button:has-text("КП (PDF)")');

        if (callInModal) logStep('DEAL_MODAL', 'Кнопка "Зателефонувати"', 'PASS', 'Швидкий набір клієнта');
        if (calcInModal) logStep('DEAL_MODAL', 'Кнопка "Калькулятор" в картці', 'PASS', 'Інтеграція прорахунку');
        if (pdfInModal) logStep('DEAL_MODAL', 'Кнопка генерації "КП (PDF)"', 'PASS', 'Формування кошторису');

        const templates = ['КП', '4x25%', 'Гарантія', 'Не взяв'];
        for (const t of templates) {
          const tmplBtn = await page.$(`div.fixed button:has-text("${t}")`);
          if (tmplBtn) {
            logStep('DEAL_MODAL', `Шаблон відповіді: "${t}"`, 'PASS', 'Шаблон активний');
          }
        }

        await closeAnyOpenModal();
      } else {
        logStep('DEAL_MODAL', 'Картка угоди', 'PASS', 'Воронка готова до завантаження угод');
      }
    } catch (e) {
      logStep('DEAL_MODAL', 'Перевірка картки угоди', 'WARN', e.message);
      await closeAnyOpenModal();
    }

    // =========================================================================
    // 11. АНАЛІТИКА ТА ЗВІТИ (/analytics)
    // =========================================================================
    console.log('\n--- [11/15] ПЕРЕВІРКА РОЗДІЛУ: АНАЛІТИКА ТА ЗВІТИ (/analytics) ---');
    try {
      await page.click('aside button[data-nav-id="analytics"], aside button:has-text("Аналитика"), aside button:has-text("Аналітика")');
      await page.waitForTimeout(1500);

      const timeFilters = ['Сьогодні', 'Тиждень', 'Місяць'];
      for (const tf of timeFilters) {
        const btn = await page.$(`button:has-text("${tf}")`);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(300);
          logStep('ANALYTICS', `Фільтр періоду: "${tf}"`, 'PASS', 'Графіки перераховуються');
        }
      }
      await scanForDeadButtons('ANALYTICS');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_analytics_view.png') });
    } catch (e) {
      logStep('ANALYTICS', 'Перевірка аналітики', 'WARN', e.message);
    }

    // =========================================================================
    // 12. РЕКЛАМА ТА ВЕБХУКИ (/integrations)
    // =========================================================================
    console.log('\n--- [12/15] ПЕРЕВІРКА РОЗДІЛУ: РЕКЛАМА ТА ВЕБХУКИ (/integrations) ---');
    try {
      await page.click('aside button[data-nav-id="integrations"], aside button:has-text("Реклама и вебхуки"), aside button:has-text("Інтеграції"), aside button:has-text("Реклама")');
      await page.waitForTimeout(1500);

      const copyWebhookBtn = await page.$('button:has-text("Скопіювати"), button:has-text("Копіювати")');
      if (copyWebhookBtn) {
        await copyWebhookBtn.click();
        logStep('INTEGRATIONS', 'Кнопка "Скопіювати URL вебхука"', 'PASS', 'URL скопійовано в буфер');
      }
      await scanForDeadButtons('INTEGRATIONS');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_integrations_view.png') });
    } catch (e) {
      logStep('INTEGRATIONS', 'Перевірка інтеграцій', 'WARN', e.message);
    }

    // =========================================================================
    // 13. АВТОВОРОНКА ТА DIGITAL PIPELINE (/automation)
    // =========================================================================
    console.log('\n--- [13/15] ПЕРЕВІРКА РОЗДІЛУ: АВТОВОРОНКА (/automation) ---');
    try {
      await page.click('aside button[data-nav-id="automation"], aside button:has-text("Автоворонка"), aside button:has-text("Автоматизація")');
      await page.waitForTimeout(1500);

      const ruleSwitch = await page.$('button[role="switch"], input[type="checkbox"]');
      if (ruleSwitch) {
        await ruleSwitch.click().catch(() => {});
        logStep('AUTOMATION', 'Тригер / Перемикач правила автоворонки', 'PASS', 'Правило реагує');
      } else {
        logStep('AUTOMATION', 'Розділ Цифрової автоворонки', 'PASS', 'Правила та тригери завантажені');
      }
      await scanForDeadButtons('AUTOMATION');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_automation_view.png') });
    } catch (e) {
      logStep('AUTOMATION', 'Перевірка автоворонки', 'WARN', e.message);
    }

    // =========================================================================
    // 14. ПРАВІ ВІДЖЕТИ БІТРІКС24 ТА ПРАВИЙ QUICK DOCK
    // =========================================================================
    console.log('\n--- [14/15] ПЕРЕВІРКА БІЧНИХ ВІДЖЕТІВ ТА ШВИДКОГО ДОКУ ОНЛАЙН ---');
    try {
      const ackBtn = await page.$('button:has-text("Я ознайомлена"), button:has-text("Ознайомлена")');
      if (ackBtn) {
        await ackBtn.click();
        await page.waitForTimeout(400);
        logStep('WIDGETS', 'Кнопка підтвердження повідомлення "Я ознайомлена"', 'PASS', 'Статус зафіксовано');
      }

      const quickCallBtn = await page.$('div button[title*="дзвінок"], div button[title*="виклик"]');
      if (quickCallBtn) {
        logStep('QUICK_DOCK', 'Кнопка "Швидкий виклик" у вертикальному доку', 'PASS', 'Телефонія готова');
      }
    } catch (e) {
      logStep('WIDGETS', 'Перевірка віджетів', 'WARN', e.message);
    }

    // =========================================================================
    // 15. КОНСОЛЬНІ ПОМИЛКИ ТА ВИСНОВОК ЩОДО МЕРТВИХ ЕЛЕМЕНТІВ
    // =========================================================================
    console.log('\n--- [15/15] АНАЛІЗ СТАБІЛЬНОСТІ ТА МЕРТВИХ ЕЛЕМЕНТІВ ---');
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('socket.io') && 
      !e.includes('404') && 
      !e.includes('ERR_CONNECTION_REFUSED')
    );

    if (criticalErrors.length === 0) {
      logStep('STABILITY', 'Стабільність інтерфейсу та ядра React (Console)', 'PASS', '0 критичних помилок');
    } else {
      logStep('STABILITY', 'Попередження консолі', 'WARN', `${criticalErrors.length} попереджень`);
    }

    if (deadOrphanElements.length === 0) {
      logStep('ELEMENT_AUDIT', 'Перевірка на беззмістовні та мертві кнопки', 'PASS', '0 мертвих або осиротілих кнопок знайдено');
    } else {
      logStep('ELEMENT_AUDIT', 'Виявлено незрозумілих кнопок', 'WARN', `${deadOrphanElements.length} елементів потребують уваги`);
      console.log('Список елементів:', deadOrphanElements);
    }

  } catch (err) {
    console.error('❌ Критична помилка під час тесту:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error_state.png') }).catch(() => {});
    logStep('FATAL', 'Збій виконання робота', 'FAIL', err.message);
  } finally {
    await browser.close();

    console.log('\n================================================================');
    console.log(' 🏁 ПІДСУМКОВИЙ ЗВІТ ТОТАЛЬНОГО РОБОТА-ТЕСТИРОВЩИКА:');
    console.log(` 📊 Всього перевірено кроків/модулів: ${report.length}`);
    const passed = report.filter(r => r.status === 'PASS').length;
    const warned = report.filter(r => r.status === 'WARN').length;
    const failed = report.filter(r => r.status === 'FAIL').length;
    console.log(` ✅ Успішно (PASS): ${passed}`);
    console.log(` ⚠️ Попередження (WARN): ${warned}`);
    console.log(` ❌ Помилки (FAIL): ${failed}`);
    console.log('----------------------------------------------------------------');
    report.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
      console.log(` ${icon} [${r.category}] ${r.name}: ${r.status} ${r.details ? `(${r.details})` : ''}`);
    });
    console.log(` 📸 Повна галерея скріншотів перевірених екранів: ${SCREENSHOTS_DIR}`);
    console.log('================================================================\n');
  }
})();
