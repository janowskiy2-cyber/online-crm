import { ModelRouterService } from './model-router.service';

export class GeminiService {
  /**
   * Analyze employer brief/job order with multi-model failover
   */
  public static async analyzeEmployerBrief(briefText: string): Promise<{ text: string; modelUsed: string }> {
    const prompt = `Ти — провідний експерт з міжнародного рекрутингу та аутстаффінгу робочої сили в Східну Європу.
Проаналізуй заявку від підприємства та склади структурований профіль:
1. Ключові технічні вимоги до кандидатів.
2. Рекомендована країна підбору (Узбекистан, Індія, Азербайджан чи Філіппіни) та обґрунтування чому.
3. Оцінка реалістичності термінів (віза D / дозволи).
4. Рекомендована ставка заробітної плати та умови житла/харчування.

Текст заявки:
"${briefText}"`;

    return ModelRouterService.generateContentWithFailover(
      prompt,
      () => GeminiService.fallbackBriefAnalysis(briefText)
    );
  }

  /**
   * Generate high-converting candidate pitch for plant director with multi-model failover
   */
  public static async generateCandidatePitch(
    companyName: string,
    vacancy: string,
    candidate: any
  ): Promise<{ text: string; modelUsed: string }> {
    const prompt = `Склади професійний, переконливий супровідний лист українською мовою для керівництва компанії "${companyName}".
Ми представляємо кандидата на посаду "${vacancy}".
Дані кандидата:
- Ім'я: ${candidate.name}
- Країна: ${candidate.country}
- Спеціальність: ${candidate.profession}
- Досвід: підтверджений тестами та відеозйомкою навантаження.
- Статус візи: готовий до оформлення пакета документів.

Зроби акцент на дисципліні, високій мотивації до заробітку, перевірці службою безпеки та гарантії безкоштовної заміни у разі невідповідності.`;

    return ModelRouterService.generateContentWithFailover(
      prompt,
      () => GeminiService.fallbackCandidatePitch(companyName, vacancy, candidate)
    );
  }

  /**
   * Smart Objection Answer with multi-model failover
   */
  public static async answerObjection(objectionText: string): Promise<{ text: string; modelUsed: string }> {
    const prompt = `Ти — топ-менеджер з продажу міжнародного лізингу та рекрутингу персоналу.
Клієнт (роботодавець/завод) висловлює заперечення: "${objectionText}".
Дай чітку, психологічно вивірену відповідь за технікою:
1. Приєднання («Цілком розумію ваше занепокоєння...»).
2. Аргумент надійності (офіційні візи D, закордонні паспорти, договірна гарантія заміни, оплата 4х25% прив'язана до результату).
3. Закриваючий заклик до дії («Пропоную узгодити технічне завдання, і ми покажемо перші 3 резюме безкоштовно»).`;

    return ModelRouterService.generateContentWithFailover(
      prompt,
      () => GeminiService.fallbackObjectionAnswer(objectionText)
    );
  }

  /**
   * AI Smart Message Draft in Deal Chat
   */
  public static async draftMessageReply(context: {
    clientName?: string;
    stageName?: string;
    dealTitle?: string;
    lastMessage?: string;
    intent?: 'followup' | 'kp_offer' | 'meeting' | 'polite_reminder';
  }): Promise<{ text: string; modelUsed: string }> {
    const prompt = `Ти — кваліфікований менеджер CRM з B2B рекрутингу персоналу та контрактів.
Склади коротке, ввічливе, ділове повідомлення для клієнта у WhatsApp/Telegram.
Контекст:
- Клієнт/Контакт: ${context.clientName || 'Клієнт'}
- Поточний етап угоди: ${context.stageName || 'Переговори'}
- Назва угоди: ${context.dealTitle || 'Заявка'}
- Останній контекст/повідомлення: "${context.lastMessage || 'Очікуємо відповіді після первинного контакту'}"
- Мета: ${context.intent === 'kp_offer' ? 'Запропонувати КП та приклад резюме кандидатів' : context.intent === 'meeting' ? 'Запропонувати короткий 10-хвилинний дзвінок' : 'Ввічливо нагадати про домовленість та запитати чи вдалося переглянути матеріали'}

Вимоги:
- Мова: українська.
- До 3-4 речень, без зайвої води.
- Заклик до дії наприкінці.
- Поверни ТІЛЬКИ текст готового повідомлення без лапок і коментарів.`;

    return ModelRouterService.generateContentWithFailover(
      prompt,
      () => GeminiService.fallbackDraftReply(context)
    );
  }

  /**
   * AI Deal Health & Win Probability Scoring
   */
  public static async scoreDeal(deal: {
    title: string;
    budget?: number;
    stageName?: string;
    daysSinceCreation?: number;
    hasTasks?: boolean;
    hasNotes?: boolean;
  }): Promise<{ text: string; modelUsed: string }> {
    const prompt = `Оціни здоров'я угоди в CRM (0-100%) та дай коротку рекомендацію для менеджера.
Дані угоди:
- Назва: ${deal.title}
- Бюджет: ${deal.budget || 0} грн
- Етап: ${deal.stageName || 'Нова'}
- Днів у роботі: ${deal.daysSinceCreation || 1}
- Наявність запланованих завдань: ${deal.hasTasks ? 'Так' : 'Ні (ризик втрати)'}
- Активність/замітки: ${deal.hasNotes ? 'Є історія' : 'Немає активності'}

Поверни валідний JSON у форматі:
{
  "score": 85,
  "temperature": "🔥 Гаряча",
  "reason": "Етап фіналізації, але необхідно поставити контроль дедлайну",
  "nextAction": "Зателефонувати клієнту для узгодження дати підписання договору"
}`;

    return ModelRouterService.generateContentWithFailover(
      prompt,
      () => GeminiService.fallbackDealScore(deal)
    );
  }

  private static fallbackDraftReply(ctx: any): string {
    const name = ctx.clientName ? ctx.clientName.split(' ')[0] : 'Добрий день';
    if (ctx.intent === 'kp_offer') {
      return `Вітаю, ${name}! Підготували для вас розрахунок вартості та приклади перевірених кандидатів за вашою специфікацією. Надіслати комерційну пропозицію для ознайомлення?`;
    }
    if (ctx.intent === 'meeting') {
      return `Вітаю, ${name}! Чи буде у вас 10 хвилин сьогодні для короткого дзвінка? Обговоримо терміни заїзду працівників та деталі проекту.`;
    }
    return `Вітаю, ${name}! Підкажіть, будь ласка, чи вдалося переглянути попередні матеріали? Будемо раді відповісти на будь-які запитання та узгодити наступний крок.`;
  }

  private static fallbackDealScore(deal: any): string {
    const hasTasks = !!deal.hasTasks;
    const score = hasTasks ? 80 : 45;
    const temp = hasTasks ? '⚡ Перспективна' : '⚠️ Ризик втрати';
    const reason = hasTasks ? 'Угода на активному етапі, є запланований контакт.' : 'Увага: у даної угоди немає запланованих завдань!';
    const nextAction = hasTasks ? 'Провести заплановану дію вчасно.' : 'Обов’язково поставте завдання або призначте дзвінок.';
    return JSON.stringify({ score, temperature: temp, reason, nextAction });
  }

  private static fallbackBriefAnalysis(text: string): string {
    return `📋 **AI Аналіз заявки підприємства:**\n` +
      `• **Профіль працівників:** Потрібні дисципліновані працівники з базовим розумінням процесів або технічними навичками.\n` +
      `• **Рекомендований напрямок підбору:** \n` +
      `  - 🇺🇿 **Узбекистан:** Швидкий заїзд (1.5–2 міс.), без мовного бар'єру, ідеально для складів, харчового виробництва, будівельних робіт.\n` +
      `  - 🇮🇳 **Індія:** Зварювальники, токарі, водії навантажувачів, висока працездатність (термін 2.5–3.5 міс.).\n` +
      `• **Фінансова схема:** Рекомендовано застосувати стандартну модель 4х25% (Аванс -> Списки -> Візи D -> Вихід у цех).\n` +
      `• **Юридичний захист:** Обов'язкове включення пункту про безкоштовну заміну працівника протягом 14 днів у разі невідповідності.`;
  }

  private static fallbackCandidatePitch(company: string, vacancy: string, cand: any): string {
    return `Доброго дня! Представляємо перевіреного кандидата для компанії "${company}" на позицію "${vacancy || cand?.profession || 'Спеціаліст'}":\n\n` +
      `👤 **${cand?.name || 'Кандидат'}** (${cand?.country || 'Центральна Азія'})\n` +
      `🔧 **Кваліфікація:** ${cand?.profession || 'Оператор / Спеціаліст'}\n` +
      `🛡️ **Верифікація:** Пройдено попередній скринінг службою безпеки, надано довідку про відсутність судимості та медичний чекап.\n` +
      `📑 **Статус:** Документи готові до реєстрації в міграційній службі для отримання робочої візи D.\n` +
      `🤝 **Гарантія:** Забезпечуємо безкоштовну заміну фахівця у разі невиходу або невідповідності кваліфікації за договором.`;
  }

  private static fallbackObjectionAnswer(objection: string): string {
    return `«Цілком розумію ваше запитання — безпека та стабільність персоналу на виробництві завжди на першому місці.\n\n` +
      `Саме тому за нашим договором:\n` +
      `1. Оплата розбита на 4 безпечні транші по 25%, і фінальний розрахунок відбувається лише тоді, коли людина вже відпрацювала перші зміни у вашому цеху.\n` +
      `2. Якщо кандидат з будь-якої причини не підійде — ми робимо повну безкоштовну заміну з резервного пулу протягом 5 робочих днів.\n\n` +
      `Пропоную зафіксувати специфікацію вакансії, і ми підберемо перші резюме для ознайомлення без жодних зобов'язань!»`;
  }
}
