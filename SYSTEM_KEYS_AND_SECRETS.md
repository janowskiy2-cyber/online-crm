# 🔑 ВСЕ КЛЮЧИ, ДОСТУПЫ, АРХИТЕКТУРА И ИНСТРУКЦИИ CRM
> **Полная документация и реестр ключей для продолжения разработки через Fable 5.1 / GitLab Duo / разработчиков.**

---

## 🏗️ 1. АРХИТЕКТУРА И СТЕК СИСТЕМЫ

Система построена по стандарту современных Enterprise CRM (гибрид Bitrix24 и amoCRM):

* **Frontend:**
  - `React 18` + `TypeScript` + `Vite`
  - Стилизация: `Tailwind CSS`, Glassmorphism, Dark/Light темы
  - Иконки: `lucide-react`
  - Drag-and-Drop: `@hello-pangea/dnd`
  - Сетевой слой: `axios` с глобальным перехватчиком и авторизацией
  - Роутинг: `react-router-dom v6`
  - Размещение: **Vercel** (`https://online-crm-alpha.vercel.app`)

* **Backend:**
  - `Node.js` + `Express` + `TypeScript`
  - ORM: `Prisma 5`
  - База данных: **PostgreSQL (Neon Tech Serverless)** с Connection Pooling
  - Хранилище медиа / аватаров / резюме: **Cloudinary CDN**
  - Мессенджеры:
    * **WhatsApp:** `@whiskeysockets/baileys` (QR-код авторизация прямо в браузере)
    * **Telegram:** `telegram` (GramJS / MTProto — **строго корпоративный личный аккаунт**, не бот!)
  - WebSockets: `ws` (для real-time чатов, звонков, уведомлений)
  - Телефония: WebRTC + GSM модалки + ссылки `whatsapp://` и `tg://`

---

## 🔐 2. ДЕЙСТВУЮЩИЕ БОЕВЫЕ КЛЮЧИ И СЕКРЕТЫ

### 🗄️ База данных PostgreSQL (Neon Tech):
```env
DATABASE_URL="postgresql://neondb_owner:npg_vnJOB4ex2DzP@ep-proud-mode-axoyoljt-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
```
* **Хост:** `ep-proud-mode-axoyoljt-pooler.c-4.us-east-2.aws.neon.tech`
* **Пользователь:** `neondb_owner`
* **Пароль:** `npg_vnJOB4ex2DzP`
* **База данных:** `neondb`
* **SSL:** `require`

### ☁️ Облачное хранилище медиафайлов (Cloudinary):
```env
CLOUDINARY_CLOUD_NAME="eta3mkod"
CLOUDINARY_API_KEY="554474578698792"
CLOUDINARY_API_SECRET="aXiH8vWKivNR1MighFWoCVr6vg4"
CLOUDINARY_URL="cloudinary://554474578698792:aXiH8vWKivNR1MighFWoCVr6vg4@eta3mkod"
```

### 🛡️ Мастер-доступ и безопасность (Администратор):
```env
ADMIN_MASTER_KEY="22222222"
JWT_SECRET="crm_super_secret_jwt_2026_key"
PORT=4000
NODE_ENV=production
```
* **Мастер-пароль / PIN администратора:** `22222222`
  - Дает мгновенный вход в систему без пароля.
  - Разблокирует Панель Администратора, генерацию паролей и Round-Robin распределение лидов.
* **Главный Super Admin Email:** `admin@crm.pro` (Пароль: `22222222`)
* **Владелец:** `roman@crm.pro` (Роман Яновський, Super Admin)
* **РОП:** `oksana@crm.pro` (Оксана Черезова)

---

## 🌐 3. РЕПОЗИТОРИИ И ССЫЛКИ ДЕПЛОЯ

* **GitLab Репозиторий:**
  - `https://gitlab.com/crm9930836/crm.git`
  - Токен доступа: `glpat-MZUHeoddHeI6S71Yz2xRKmM6MQpvOjEKdTpwMjZkaA8.01.1706nljzx`
* **GitHub Репозиторий (резервный):**
  - `https://github.com/janowskiy2-cyber/online-crm.git`
* **Боевой фронтенд (Production URL):**
  - `https://online-crm-alpha.vercel.app`

---

## 🤖 4. ИНСТРУКЦИЯ ДЛЯ FABLE 5.1 / РАЗРАБОТЧИКОВ

### 1. Первичная настройка и запуск:
```bash
# Установка зависимостей
npm run install:all

# Генерация Prisma клиента под Neon PostgreSQL
cd server
npx prisma generate
npx prisma db push

# Локальный запуск (Frontend + Backend)
npm run dev
```

### 2. Запуск автоматического Playwright тестировщика:
В проекте настроен робот `test-crm-robot.js`, который проверяет все 15 модулей CRM:
```bash
node test-crm-robot.js
```
Текущий эталонный статус робота: **45/45 PASS (100% успех, 0 ошибок)**.

### 3. Главные бизнес-правила (Strict Rules):
1. **Telegram — только корпоративный аккаунт (MTProto StringSession), НЕ бот!** Клиенты B2B рекрутинга должны общаться с живым аккаунтом с реальным номером и аватаром.
2. **Zero Data Loss (Мягкое удаление):** Все удаления сущностей (сделки, кандидаты, работодатели, сотрудники) выполняются через статус `isArchived: true` с 30-дневным окном восстановления в корзине.
3. **Защита от дубликатов:** При создании сделок проверяется телефон и название компании во избежание захламления базы.
4. **Доступность модалок:** Все модальные окна обязаны поддерживать `Escape`, клик по оверлею (backdrop dismissal) и атрибуты `data-testid="close-modal"` / `data-modal-close`.

---

## 📁 5. СТРУКТУРА ПАПОК ПРОЕКТА

```
├── client/                     # Frontend (Vite + React + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # Панель Администратора, Round-Robin, сброс паролей
│   │   │   ├── analytics/      # Дашборды, графики, воронка конверсий
│   │   │   ├── automation/     # Цифровая автоворонка (Digital Pipeline триггеры)
│   │   │   ├── contacts/       # Предприятия-работодатели и представители HR
│   │   │   ├── deal-modal/     # Детальная 6-вкладочная карточка сделки с чатом
│   │   │   ├── feed/           # Живая корпоративная лента Bitrix24
│   │   │   ├── inbox/          # Unified Inbox (WhatsApp + Telegram чаты)
│   │   │   ├── integrations/   # Вебхуки рекламы (FB, Google, TikTok, Tilda)
│   │   │   ├── kanban/         # Воронка угод, DealCard, колонки, Drag-n-Drop
│   │   │   ├── layout/         # Navbar, Sidebar, RightWidgetSidebar, RightQuickDock
│   │   │   ├── modals/         # CreateDealModal, ImportCsvModal, Calculator и др.
│   │   │   ├── recruiting/     # База кандидатов, фильтры стран, скрипты возражений
│   │   │   ├── tasks/          # Управление задачами, канбан задач, фильтры
│   │   │   └── telephony/      # CallModal, WebRTC, звонки в WhatsApp/Telegram
│   │   ├── context/            # AuthContext (матрица 20 пользователей, переключение)
│   │   ├── services/           # Axios API клиент, сокеты
│   │   └── types/              # TypeScript интерфейсы
├── server/                     # Backend (Express + Prisma + PostgreSQL)
│   ├── prisma/                 # schema.prisma (Neon Tech PostgreSQL)
│   ├── src/
│   │   ├── routes/             # auth, deals, contacts, chat, users, pipelines
│   │   ├── services/           # whatsapp.service.ts, telegram.service.ts, socket.service.ts
│   │   └── index.ts            # Главный сервер Express + WebSockets
├── test-crm-robot.js           # Playwright QA робот (45 насквозных тестов)
├── push-to-gitlab.bat          # 1-клик отправка изменений на GitLab
└── README.md                   # Общая презентация системы
```
