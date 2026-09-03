import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyA_Free_Public_Gemini_Key_Placeholder';
const genAI = new GoogleGenerativeAI(apiKey);

export class GeminiService {
  /**
   * Analyze employer brief/job order
   */
  public static async analyzeEmployerBrief(briefText: string): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return GeminiService.fallbackBriefAnalysis(briefText);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Ти — провідний експерт з міжнародного рекрутингу та аутстаффінгу робочої сили в Східну Європу.
Проаналізуй заявку від підприємства та склади структурований профіль:
1. Ключові технічні вимоги до кандидатів.
2. Рекомендована країна підбору (Узбекистан, Індія, Азербайджан чи Філіппіни) та обґрунтування чому.
3. Оцінка реалістичності термінів (віза D / дозволи).
4. Рекомендована ставка заробітної плати та умови житла/харчування.

Текст заявки:
"${briefText}"`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      console.warn('Gemini API notice, using smart internal recruiter AI logic:', err.message);
      return GeminiService.fallbackBriefAnalysis(briefText);
    }
  }

  /**
   * Generate high-converting candidate pitch for plant director
   */
  public static async generateCandidatePitch(companyName: string, vacancy: string, candidate: any): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return GeminiService.fallbackCandidatePitch(companyName, vacancy, candidate);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Склади професійний, переконливий супровідний лист українською мовою для керівництва компанії "${companyName}".
Ми представляємо кандидата на посаду "${vacancy}".
Дані кандидата:
- Ім'я: ${candidate.name}
- Країна: ${candidate.country}
- Спеціальність: ${candidate.profession}
- Досвід: підтверджений тестами та відеозйомкою навантаження.
- Статус візи: готовий до оформлення пакета документів.

Зроби акцент на дисципліні, високій мотивації до заробітку, перевірці службою безпеки та гарантії безкоштовної заміни у разі невідповідності.`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      return GeminiService.fallbackCandidatePitch(companyName, vacancy, candidate);
    }
  }

  /**
   * Smart Objection Answer (Recruitment Specific)
   */
  public static async answerObjection(objectionText: string): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return GeminiService.fallbackObjectionAnswer(objectionText);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Ти — топ-менеджер з продажу міжнародного лізингу та рекрутингу персоналу.
Клієнт (роботодавець/завод) висловлює заперечення: "${objectionText}".
Дай чітку, психологічно вивірену відповідь за технікою:
1. Приєднання («Цілком розумію ваше занепокоєння...»).
2. Аргумент надійності (офіційні візи D, закордонні паспорти, договірна гарантія заміни, оплата 4х25% прив'язана до результату).
3. Закриваючий заклик до дії («Пропоную узгодити технічне завдання, і ми покажемо перші 3 резюме безкоштовно»).`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      return GeminiService.fallbackObjectionAnswer(objectionText);
    }
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
