# 🌐 B2B КЛИЕНТСКИЙ ПОРТАЛ & ОФИЦИАЛЬНЫЙ САЙТ КОМПАНИИ
## Полная спецификация интеграции с базой данных CRM «Recruiter I Club»

> **Назначение документа:** Данный файл является исчерпывающим техническим заданием, архитектурным руководством и мостом интеграции для разработки **второго отдельного проекта** (отдельный репозиторий GitHub, отдельный аккаунт Vercel).
> 
> Новый проект решает 2 ключевые задачи:
> 1. **Официальный представительский сайт компании (Public Marketing Landing):** Презентация услуг международного рекрутинга, калькулятор стоимости подбора, анонимная витрина доступных специалистов, сбор лидов (заявки сразу попадают в воронку действующей CRM).
> 2. **Личный кабинет заказчика (B2B Client Portal):** Защищенное рабочее пространство работодателя, где он в режиме реального времени видит своих прикрепленных кандидатов, их паспорта/резюме/видеовизитки, утверждает или отклоняет работников, отслеживает статус виз и дату приезда, просматривает договоры и счета, а также подает новые заявки на наем.

---

## 🔑 1. ДОСТУПЫ, КЛЮЧИ И ОКРУЖЕНИЕ (.ENV ДЛЯ НОВОГО ПРОЕКТА)

Создайте файл `.env` в корне нового проекта со следующими переменными. Они обеспечивают прямое подключение к единой базе данных и облачному хранилищу файлов без задержек и промежуточных синхронизаций.

```env
# ==============================================================================
# 🗄️ ПОДКЛЮЧЕНИЕ К ЕДИНОЙ БАЗЕ ДАННЫХ CRM (PostgreSQL Neon Serverless)
# ==============================================================================
# Пуллер соединений (для продакшн Vercel Serverless Functions):
DATABASE_URL="postgresql://neondb_owner:npg_vnJOB4ex2DzP@ep-proud-mode-axoyoljt-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Прямое подключение (для выполнения npx prisma db pull / npx prisma generate):
DIRECT_URL="postgresql://neondb_owner:npg_vnJOB4ex2DzP@ep-proud-mode-axoyoljt.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

# ==============================================================================
# ☁️ ОБЛАЧНОЕ ХРАНИЛИЩЕ ДОКУМЕНТОВ И РЕЗЮМЕ (Cloudinary Storage)
# ==============================================================================
CLOUDINARY_CLOUD_NAME="eta3mkod"
CLOUDINARY_API_KEY="554474578698792"
CLOUDINARY_API_SECRET="aXiH8vWKivNR1MighFWoCVr6vg4"
CLOUDINARY_URL="cloudinary://554474578698792:aXiH8vWKivNR1MighFWoCVr6vg4@eta3mkod"

# ==============================================================================
# 🔐 СЕКРЕТЫ ДЛЯ АВТОРИЗАЦИИ В КАБИНЕТЕ КЛИЕНТА (JWT & Sessions)
# ==============================================================================
JWT_SECRET="recruiter_club_client_portal_super_jwt_secret_key_2026"
NEXT_PUBLIC_APP_URL="https://your-client-portal.vercel.app"
NODE_ENV="production"
```

---

## ⚠️ 2. СТРОЖАЙШИЕ ПРАВИЛА БЕЗОПАСНОСТИ БАЗЫ ДАННЫХ (ЧТО НЕЛЬЗЯ ТРОГАТЬ!)

> [!CAUTION]
> **ПРАВИЛО №1: КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ ДЕСТРУКТИВНЫЕ МИГРАЦИИ PRISMA!**
> - **НИКОГДА** не запускайте в новом проекте:
>   - `npx prisma migrate dev`
>   - `npx prisma migrate reset`
>   - `npx prisma db push --force-reset`
>   - `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN DROP NOT NULL`
> - Любое изменение структуры колонок или удаление таблиц сломает основную CRM-систему менеджеров.
> - В новом проекте используйте схему как **Read / Safe-Write**, выполняя команду:
>   ```bash
>   npx prisma generate
>   ```

> [!CAUTION]
> **ПРАВИЛО №2: ЗАПРЕЩЕНЫ ФИЗИЧЕСКИЕ УДАЛЕНИЯ (ZERO HARD DELETE).**
> - **НИКОГДА** не вызывайте:
>   - `prisma.company.delete()`
>   - `prisma.contact.delete()`
>   - `prisma.deal.delete()`
>   - `prisma.task.delete()`
>   - `prisma.*.deleteMany()`
> - Все удаления должны быть исключительно мягкими (**Soft-Delete**):
>   ```typescript
>   await prisma.contact.update({
>     where: { id: candidateId },
>     data: { isDeleted: true, deletedAt: new Date() }
>   });
>   ```

> [!WARNING]
> **ПРАВИЛО №3: НЕ ПРИКАСАТЬСЯ К ТАБЛИЦЕ `MessengerSession`!**
> - Таблица `MessengerSession` хранит зашифрованные бинарные сессии подключенных телефонов менеджеров (WhatsApp Baileys и Telegram GramJS MTProto).
> - Любая запись или модификация этой таблицы разорвет связь менеджеров с клиентами в реальном времени.

> [!IMPORTANT]
> **ПРАВИЛО №4: АККУРАТНАЯ РАБОТА С JSON-ПОЛЯМИ (`customFields`, `documents`).**
> - В таблицах `Deal` и `Contact` поля `customFields` и `documents` хранятся в виде JSON-строк (`String?`).
> - При обновлении информации в сделке **ОБЯЗАТЕЛЬНО** сначала считывайте существующий объект, делайте spread `...existing`, добавляйте изменения и только потом сохраняйте `JSON.stringify(merged)`. Иначе вы сотрете историю договоров, оплат и этапов!

---

## 🗺️ 3. СТРУКТУРА ДАННЫХ И СВЯЗИ В CRM (ПОЛНАЯ КАРТА)

В базе данных CRM сущности заказчика и кандидатов устроены следующим образом:

```mermaid
erDiagram
    Company ||--o{ Contact : "имеет сотрудников HR и кандидатов"
    Company ||--o{ Deal : "заявки на подбор и договоры"
    Deal ||--o{ DealNote : "лента событий и согласований"
    Deal ||--o{ Task : "задачи менеджеров"
    User ||--o{ Deal : "ответственный менеджер"

    Company {
        string id PK "UUID компании"
        string name "Название работодателя (ТОВ 'Буд-Майстер')"
        string phone "Телефон компании"
        string email "Email для уведомлений"
        string website "Сайт компании"
        string address "Юридический/фактический адрес"
        boolean isDeleted "Флаг мягкого удаления"
    }

    Contact {
        string id PK "UUID контакта"
        string companyId FK "Связь с Company.id"
        string name "ПИБ контакта или кандидата"
        string type "b2b_contact (представитель) ИЛИ candidate (работник)"
        string country "Страна кандидата (Узбекистан, Индия...)"
        string profession "Профессия (Сварщик, Арматурщик...)"
        string status "Статус кандидата в воронке"
        string videoUrl "Ссылка на видео-визитку (YouTube/Cloudinary)"
        string resumeUrl "Ссылка на PDF резюме в Cloudinary"
        string phone "Телефон"
        string email "Email"
        string whatsapp "WhatsApp"
        string telegram "Telegram"
        string documents "JSON массив документов (паспорт, сертификаты)"
        int experienceYears "Опыт работы (лет)"
        string salaryExpectation "Зарплатные ожидания"
        string skills "Навыки"
        string languages "Владение языками"
        string driverLicense "Категории водительских прав"
        string bio "Краткое досье кандидата"
        boolean isDeleted "Флаг мягкого удаления"
    }

    Deal {
        string id PK "UUID сделки / заявки"
        string title "Название сделки ('Заявка: Сварщики 10 чел')"
        float budget "Сумма контракта (EUR / UAH)"
        string pipelineId FK "ID воронки продаж"
        string stageId FK "ID текущего этапа"
        string companyId FK "ID компании-заказчика"
        string contactId FK "ID основного контактного лица"
        string responsibleId FK "Ответственный менеджер (User)"
        string customFields "JSON с договором, статусом оплаты и деталями"
        boolean isDeleted "Флаг мягкого удаления"
    }

    DealNote {
        string id PK "UUID события"
        string dealId FK "ID сделки"
        string userId FK "ID менеджера или системы"
        string type "comment | status_change | call_record"
        string content "Текст заметки или согласования"
        datetime createdAt "Дата и время события"
    }
```

### Как разделяются контакты:
1. **Представители заказчика (HR-директора, директора, менеджеры):**
   - `Contact.type = "b2b_contact"`
   - `Contact.companyId = Company.id`
   - Используются для авторизации в Личном кабинете (по email / телефону).
2. **Кандидаты, прикрепленные к компании (Работники):**
   - `Contact.type = "candidate"`
   - `Contact.companyId = Company.id` (если кандидат назначен на объект этого работодателя).
   - В Личном кабинете работодатель видит **только тех кандидатов**, у которых `companyId === Company.id && type === "candidate" && isDeleted === false`.

---

## 🚦 4. СТАТУСЫ КАНДИДАТОВ И МЕХАНИКА УТВЕРЖДЕНИЯ

В CRM используются следующие стандартизированные статусы кандидатов (`Contact.status`):

| Статус в базе (`Contact.status`) | Название для клиента в кабинете | Цвет бейджа | Что означает |
| :--- | :--- | :--- | :--- |
| `screening` | 🔍 На рассмотрении | Серый | Кандидат подобран рекрутером, ожидает решения заказчика |
| `approved_by_client` | ✅ Утвержден заказчиком | Зеленый | **Заказчик нажал «Утвердить» в кабинете** |
| `rejected_by_client` | ❌ Отклонен / Замена | Красный | Заказчик отклонил анкету, рекрутер ищет замену |
| `visa_d_processing` | 📑 Оформление визы D | Желтый | Документы поданы в визовый центр/консульство |
| `visa_ready` | ✈️ Виза D готова | Синий | Виза получена, согласовывается логистика |
| `in_transit` | 🧳 В дороге / Билеты куплены | Индиго | Работник выехал/вылетел к месту работы |
| `working` | 🏭 Вышел на смену | Изумрудный | Успешно приступил к работе на объекте заказчика |

### Логика действия «Утвердить кандидата» из кабинета:
Когда заказчик в своем личном кабинете нажимает кнопку **«✅ Утвердить кандидата»**:
1. Обновляется статус кандидата в базе данных:
   ```typescript
   await prisma.contact.update({
     where: { id: candidateId },
     data: { status: 'approved_by_client' }
   });
   ```
2. В активной сделке компании автоматически создается заметка `DealNote` (менеджер в CRM мгновенно видит уведомление):
   ```typescript
   await prisma.dealNote.create({
     data: {
       dealId: activeDealId,
       userId: deal.responsibleId, // Ответственный менеджер
       type: 'status_change',
       content: `✅ [Кабинет Заказчика] Работодатель "${company.name}" УТВЕРДИЛ кандидата: ${candidate.name} (${candidate.profession}, ${candidate.country})`
     }
   });
   ```

### Логика действия «Отклонить / Запросить замену»:
1. Статус обновляется на `rejected_by_client`.
2. Создается `DealNote` с причиной отказа:
   ```typescript
   await prisma.dealNote.create({
     data: {
       dealId: activeDealId,
       userId: deal.responsibleId,
       type: 'comment',
       content: `❌ [Кабинет Заказчика] Работодатель "${company.name}" ОТКЛОНИЛ кандидата ${candidate.name}. Причина: ${reason}`
     }
   });
   ```

---

## 📑 5. ДОГОВОРЫ, СЧЕТА И ДОКУМЕНТЫ В СДЕЛКЕ

В таблице `Deal` в поле `customFields` хранится JSON-объект следующей структуры:

```json
{
  "contractDoc": {
    "id": "doc-uuid-1",
    "name": "Договір_поставки_персоналу_БудМайстер_2026.pdf",
    "url": "https://res.cloudinary.com/eta3mkod/image/upload/v12345/contracts/contract_1.pdf",
    "sizeKb": 420
  },
  "contractStatus": "signed_active",
  "receiptDoc": {
    "id": "doc-uuid-2",
    "name": "Чек_оплати_першого_траншу.pdf",
    "url": "https://res.cloudinary.com/eta3mkod/image/upload/v12345/receipts/check_1.pdf",
    "sizeKb": 180
  },
  "paymentStatus": "paid",
  "requisitionDetails": {
    "position": "Зварювальник 135/136",
    "workersCount": 10,
    "salaryOffered": "24-28 PLN/година чистими",
    "accommodation": "Надається роботодавцем безкоштовно",
    "city": "Гданськ, Польща"
  }
}
```

### Значения `contractStatus`:
- `not_sent`: Договор формируется.
- `sent_unsigned`: Договор отправлен на подпись заказчику.
- `signed_unpaid`: Договор подписан, ожидается гарантийный платеж / аванс.
- `signed_active`: Договор подписан и действует.

В кабинете заказчика можно вывести красивую плашку: **«Ваш официальный договор»** с кнопкой мгновенного скачивания PDF и бейджем текущего статуса.

---

## 📥 6. ПРИЕМ НОВЫХ ЗАЯВОК (С САЙТА И ИЗ КАБИНЕТА)

Когда новый посетитель оставляет заявку на лендинге, либо авторизованный заказчик подает новую потребность в персонале из личного кабинета:

### Сценарий А: Новая заявка с публичного сайта (Лидогенерация)
1. Найти или создать `Company`:
   ```typescript
   let company = await prisma.company.findFirst({
     where: { 
       OR: [{ phone: formData.phone }, { email: formData.email }, { name: formData.companyName }],
       isDeleted: false 
     }
   });

   if (!company) {
     company = await prisma.company.create({
       data: {
         name: formData.companyName || `Підприємство (${formData.contactName})`,
         phone: formData.phone,
         email: formData.email,
         address: formData.city
       }
     });
   }
   ```

2. Найти или создать `Contact` типа `b2b_contact`:
   ```typescript
   let contact = await prisma.contact.findFirst({
     where: { phone: formData.phone, isDeleted: false }
   });

   if (!contact) {
     contact = await prisma.contact.create({
       data: {
         companyId: company.id,
         name: formData.contactName,
         phone: formData.phone,
         email: formData.email,
         type: 'b2b_contact',
         position: formData.position || 'Представник роботодавця'
       }
     });
   }
   ```

3. Найти воронку по умолчанию (`isDefault: true`) и ее первую стадию (`sortOrder: 0`):
   ```typescript
   const defaultPipeline = await prisma.pipeline.findFirst({
     where: { isDefault: true },
     include: { stages: { orderBy: { sortOrder: 'asc' } } }
   });

   const firstStage = defaultPipeline?.stages[0];
   const responsibleUser = await prisma.user.findFirst({
     where: { isDeleted: false, isActive: true }
   });
   ```

4. Создать сделку `Deal` в первой колонке Канбана:
   ```typescript
   const deal = await prisma.deal.create({
     data: {
       title: `Заявка з сайту: ${formData.specialty || 'Підбір персоналу'} (${formData.workersCount || 1} чол)`,
       budget: parseFloat(formData.budget || '0'),
       pipelineId: defaultPipeline!.id,
       stageId: firstStage!.id,
       companyId: company.id,
       contactId: contact.id,
       responsibleId: responsibleUser?.id || 'usr-admin',
       projectId: 'employers',
       customFields: JSON.stringify({
         requisitionDetails: {
           workersCount: formData.workersCount,
           specialty: formData.specialty,
           requirements: formData.requirements,
           salaryOffered: formData.salaryOffered,
           source: 'Офіційний сайт (Landing Page)'
         }
       })
     }
   });
   ```

5. Добавить системную заметку `DealNote`:
   ```typescript
   await prisma.dealNote.create({
     data: {
       dealId: deal.id,
       userId: deal.responsibleId,
       type: 'system',
       content: `🌐 Нова заявка з офіційного сайту компании!\n🏢 Компанія: ${company.name}\n👤 Контакт: ${contact.name} (${contact.phone})\n🎯 Потреба: ${formData.specialty} (${formData.workersCount} осіб)\n📝 Примітки: ${formData.requirements || 'Не вказано'}`
     }
   });
   ```

Менеджер в CRM моментально видит карточку лида в колонке «Нові ліди», может перезвонить клиенту или написать ему в WhatsApp / Telegram прямо из CRM.

---

## 🔒 7. БЕЗОПАСНАЯ АВТОРИЗАЦИЯ ЗАКАЗЧИКОВ В КАБИНЕТЕ

Для входа клиента в кабинет рекомендуется использовать один из двух проверенных подходов (без изменения существующей схемы базы данных):

### Рекомендуемый вариант: Вход по номеру телефона / Email + Одноразовый код (OTP) или ПИН
1. Клиент вводит свой номер телефона или email, указанный в договоре / карточке контакта.
2. Система ищет в таблице `Contact` запись с `type = 'b2b_contact'` и соответствующим телефоном/email:
   ```typescript
   const clientContact = await prisma.contact.findFirst({
     where: {
       OR: [{ phone: inputLogin }, { email: inputLogin }],
       type: 'b2b_contact',
       isDeleted: false,
       companyId: { not: null }
     },
     include: { company: true }
   });
   ```
3. Если контакт найден, на его телефон/email отправляется проверочный код (либо на время тестирования используется фиксированный сервисный мастер-пин, например `7777`).
4. После верификации кода выдается сессионный JWT токен, содержащий:
   ```json
   {
     "clientId": "contact-uuid",
     "companyId": "company-uuid",
     "companyName": "ТОВ Буд-Майстер",
     "clientName": "Олександр Іванович"
   }
   ```
5. Все последующие запросы к кабинету фильтруются строго по `companyId` из декодированного JWT токена, что гарантирует **100% изоляцию данных**: заказчик физически не может увидеть чужих кандидатов или чужие договоры.

---

## 📁 8. ГОТОВАЯ СХЕМА `SCHEMA.PRISMA` ДЛЯ НОВОГО ПРОЕКТА

Скопируйте данный блок в файл `prisma/schema.prisma` в новом проекте. Это точная зеркальная копия рабочей схемы базы данных:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                  String        @id @default(uuid())
  email               String        @unique
  password            String
  name                String
  avatar              String?
  role                String
  department          String
  phone               String?
  birthday            String?
  isActive            Boolean       @default(true)
  isDeleted           Boolean       @default(false)
  deletedAt           DateTime?
  lastActiveAt        DateTime?
  onlineMinutesToday  Int           @default(0)
  onlineMinutesWeek   Int           @default(0)
  lastPresenceDate    String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  canViewAllDeals     Boolean       @default(false)
  canViewDeptDeals    Boolean       @default(false)
  canEditDeals        Boolean       @default(true)
  canDeleteDeals      Boolean       @default(false)
  canExportData       Boolean       @default(false)
  canManageUsers      Boolean       @default(false)
  canManageIntegrations Boolean     @default(false)

  deals               Deal[]        @relation("ResponsibleUser")
  tasks               Task[]        @relation("ResponsibleUser")
  createdTasks        Task[]        @relation("CreatedByUser")
  notes               DealNote[]
  auditLogs           AuditLog[]
  feedPosts           FeedPost[]    @relation("FeedAuthor")
  feedComments        FeedComment[] @relation("FeedCommentAuthor")
  workShifts          WorkShift[]

  @@index([isDeleted])
  @@index([email])
}

model Pipeline {
  id          String           @id @default(uuid())
  name        String
  isDefault   Boolean          @default(false)
  sortOrder   Int              @default(0)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  stages      Stage[]
  deals       Deal[]
  automations AutomationRule[]
}

model Stage {
  id          String   @id @default(uuid())
  pipelineId  String
  name        String
  color       String   @default("#3b82f6")
  sortOrder   Int      @default(0)
  isWon       Boolean  @default(false)
  isLost      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  pipeline    Pipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  deals       Deal[]

  @@index([pipelineId])
  @@index([sortOrder])
}

model Company {
  id          String    @id @default(uuid())
  name        String
  phone       String?
  email       String?
  website     String?
  address     String?
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  contacts    Contact[]
  deals       Deal[]

  @@index([name])
  @@index([isDeleted])
}

model Contact {
  id                String        @id @default(uuid())
  companyId         String?
  name              String
  type              String        @default("b2b_contact") // "b2b_contact" | "candidate"
  country           String?
  profession        String?
  status            String?       @default("screening")
  videoUrl          String?
  phone             String?
  phone2            String?
  email             String?
  whatsapp          String?
  telegram          String?
  position          String?
  avatar            String?
  documents         String?       // JSON: [{ id, name, url, type, size, uploadedAt }]
  resumeUrl         String?
  experienceYears   Int?
  salaryExpectation String?
  skills            String?
  languages         String?
  driverLicense     String?
  bio               String?
  birthDate         String?
  citizenship       String?
  isDeleted         Boolean       @default(false)
  deletedAt         DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  company           Company?      @relation(fields: [companyId], references: [id], onDelete: SetNull)
  deals             Deal[]
  messages          ChatMessage[]

  @@index([companyId])
  @@index([type])
  @@index([phone])
  @@index([isDeleted])
}

model Deal {
  id            String        @id @default(uuid())
  title         String
  budget        Float         @default(0)
  pipelineId    String
  stageId       String
  projectId     String?       @default("employers")
  responsibleId String
  contactId     String?
  companyId     String?
  lossReason    String?
  tags          String?
  customFields  String?       // JSON string
  isDeleted     Boolean       @default(false)
  deletedAt     DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  closedAt      DateTime?

  pipeline      Pipeline      @relation(fields: [pipelineId], references: [id], onDelete: Restrict)
  stage         Stage         @relation(fields: [stageId], references: [id], onDelete: Restrict)
  responsible   User          @relation("ResponsibleUser", fields: [responsibleId], references: [id], onDelete: Restrict)
  contact       Contact?      @relation(fields: [contactId], references: [id], onDelete: SetNull)
  company       Company?      @relation(fields: [companyId], references: [id], onDelete: SetNull)

  tasks         Task[]
  notes         DealNote[]
  messages      ChatMessage[]

  @@index([pipelineId])
  @@index([stageId])
  @@index([responsibleId])
  @@index([companyId])
  @@index([isDeleted])
}

model Task {
  id            String    @id @default(uuid())
  dealId        String?
  responsibleId String
  createdById   String
  type          String
  text          String
  dueDate       DateTime
  isCompleted   Boolean   @default(false)
  resultText    String?
  completedAt   DateTime?
  isDeleted     Boolean   @default(false)
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  deal          Deal?     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  responsible   User      @relation("ResponsibleUser", fields: [responsibleId], references: [id], onDelete: Restrict)
  createdBy     User      @relation("CreatedByUser", fields: [createdById], references: [id], onDelete: Restrict)

  @@index([dealId])
  @@index([responsibleId])
  @@index([isCompleted])
  @@index([isDeleted])
}

model DealNote {
  id          String   @id @default(uuid())
  dealId      String
  userId      String
  type        String   @default("comment")
  content     String
  metadata    String?
  createdAt   DateTime @default(now())

  deal        Deal     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([dealId])
  @@index([userId])
}

model ChatMessage {
  id            String   @id @default(uuid())
  channel       String
  direction     String
  dealId        String?
  contactId     String?
  senderName    String?
  senderPhone   String?
  senderTgId    String?
  text          String
  mediaUrl      String?
  mediaType     String?
  status        String   @default("sent")
  externalMsgId String?
  createdAt     DateTime @default(now())

  deal          Deal?    @relation(fields: [dealId], references: [id], onDelete: SetNull)
  contact       Contact? @relation(fields: [contactId], references: [id], onDelete: SetNull)

  @@index([dealId])
  @@index([contactId])
}

model MessengerSession {
  id             String   @id @default(uuid())
  channel        String   @unique
  status         String   @default("disconnected")
  qrCodeData     String?
  sessionPayload String?
  accountName    String?
  phone          String?
  updatedAt      DateTime @updatedAt
}

model AutomationRule {
  id          String   @id @default(uuid())
  pipelineId  String
  stageId     String?
  triggerType String
  actionType  String
  actionData  String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  pipeline    Pipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  action      String
  entityType  String
  entityId    String?
  details     String?
  ipAddress   String?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Restrict)
}

model FeedPost {
  id          String        @id @default(uuid())
  authorId    String
  recipient   String        @default("Всім співробітникам")
  type        String        @default("message")
  text        String
  fileData    String?
  reactions   String?
  views       Int           @default(1)
  isPinned    Boolean       @default(false)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  author      User          @relation("FeedAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  comments    FeedComment[]
}

model FeedComment {
  id        String   @id @default(uuid())
  postId    String
  authorId  String
  text      String
  fileData  String?
  likes     Int      @default(0)
  createdAt DateTime @default(now())

  post      FeedPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  author    User     @relation("FeedCommentAuthor", fields: [authorId], references: [id], onDelete: Cascade)
}

model WorkShift {
  id           String    @id @default(uuid())
  userId       String
  startTime    DateTime  @default(now())
  endTime      DateTime?
  breakMinutes Int       @default(0)
  status       String    @default("working")
  notes        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 🤖 9. ГОТОВЫЙ ПРОМПТ ДЛЯ ИИ-АССИСТЕНТА В НОВОМ ПРОЕКТЕ

Скопируйте и вставьте текст ниже в первое сообщение AI-ассистенту при старте работы над новым проектом (в новом окне Antigravity / Cursor / VSCode):

```markdown
Привет! Ты разрабатываешь новый проект: "B2B Портал Клиента и Официальный сайт международного рекрутингового агентства Recruiter I Club".

Этот проект создается в новом репозитории GitHub и будет развернут на отдельном аккаунте Vercel. 
ОН НАПРЯМУЮ ПОДКЛЮЧАЕТСЯ К СУЩЕСТВУЮЩЕЙ БАЗЕ ДАННЫХ CRM (PostgreSQL Neon) И CLOUDINARY STORAGE.

СТРОЖАЙШИЕ ПРАВИЛА БЕЗОПАСНОСТИ БАЗЫ ДАННЫХ:
1. НИКАКИХ ДЕСТРУКТИВНЫХ МИГРАЦИЙ! Запрещены: prisma migrate dev, prisma db push --force-reset, удаление колонок и таблиц. Используй схему как готовую через `npx prisma generate`.
2. НИКАКИХ ЖЕСТКИХ УДАЛЕНИЙ! Запрещены .delete() и .deleteMany(). Все сущности удаляются только мягко через `isDeleted: true, deletedAt: new Date()`.
3. НЕЛЬЗЯ ТРОГАТЬ ТАБЛИЦУ MessengerSession — там хранятся активные сессии WhatsApp и Telegram менеджеров CRM.
4. Поле Deal.customFields — это JSON-строка. При изменении всегда читай, делай merge и сохраняй JSON.stringify(merged), чтобы не затереть существующие договоры и реквизиты.

ЧТО НУЖНО РЕАЛИЗОВАТЬ В ПРОЕКТЕ:
1. ПРЕЗЕНТАЦИОННЫЙ САЙТ (Public Landing Page):
   - Современный корпоративный дизайн премиум-уровня (Tailwind CSS, Lucide Icons, темная/светлая тема).
   - Блоки: Hero ("Подбор квалифицированного персонала из Азии и Европы"), Гарантии, Отрасли (Строительство, Производство, Склады, HoReCa), Калькулятор подбора, Интерактивная форма подачи заявки на персонал.
   - При отправке формы: заявка падает напрямую в базу CRM как новая Deal (в воронку isDefault: true, stage sortOrder: 0) с привязкой к Company и Contact, и системной заметкой DealNote.

2. ЛИЧНЫЙ КАБИНЕТ РАБОТОДАТЕЛЯ (B2B Client Portal):
   - Авторизация по номеру телефона/email представителя заказчика (Contact с type = 'b2b_contact').
   - Раздел "Мои работники (Кандидаты)": карточки кандидатов, прикрепленных к этой компании (Contact.companyId === clientCompanyId && type === 'candidate').
   - Досье кандидата: фото, страна, специальность, опыт, знание языков, кнопка просмотра видеовизитки (videoUrl) и скачивания резюме/документов (Cloudinary).
   - Кнопки действий: "✅ Утвердить кандидата" (переводит статус в 'approved_by_client' и создает DealNote в сделке) и "❌ Запросить замену".
   - Раздел "Договоры и финансы": статус официального договора (contractStatus), возможность скачать подписанный PDF (contractDoc.url), статус оплаты (paymentStatus).
   - Раздел "Подать новую заявку на вакансию": форма прямого заказа дополнительных сотрудников с сохранением новой сделки в CRM.

Все учетные данные базы данных и Cloudinary уже записаны в .env. 
Прочитай схему prisma/schema.prisma и приступай к созданию проекта!
```

---

## ✅ 10. РЕКОМЕНДУЕМЫЙ СТЕК ТЕХНОЛОГИЙ ДЛЯ НОВОГО ПРОЕКТА
- **Фреймворк:** Next.js 14/15 (App Router) или Vite + React + Express / Fastify. Идеально — **Next.js (App Router)** для максимальной скорости на Vercel и встроенных Server Actions для прямого вызова Prisma.
- **ORM:** Prisma Client (`@prisma/client`) с пуллером соединений Neon (`DATABASE_URL`).
- **Стилизация:** Tailwind CSS + `clsx` + `tailwind-merge` + `lucide-react`.
- **UI-компоненты:** Radix UI / shadcn/ui (модальные окна, дропдауны, табы, тосты).
- **Хранилище файлов:** Cloudinary SDK (`cloudinary`) для загрузки дополнительных документов или заявок клиентов.
