import { ModelRouterService } from './model-router.service';

export interface ParsedCandidateData {
  name: string;
  country: string;
  citizenship?: string;
  profession: string;
  position?: string;
  phone?: string;
  phone2?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  experienceYears?: number;
  salaryExpectation?: string;
  skills?: string[];
  languages?: string;
  driverLicense?: string;
  birthDate?: string;
  bio?: string;
  status: string;
  summary?: string;
  detectedLanguage?: string;
  wasTranslated?: boolean;
}

export class ResumeParserService {
  /**
   * Parse resume text or structured document using Gemini AI with automatic translation to Ukrainian
   */
  public static async parseResumeText(text: string): Promise<ParsedCandidateData> {
    const prompt = `Ти — висококваліфікований експертний AI-парсер та лінгвістичний перекладач резюме міжнародного рекрутингового агентства.
Твоє завдання — глибоко проаналізувати текст резюме (CV) або анкети кандидата, витягнути ВСІ ключові поля та сформувати структурований JSON для CRM-системи.

⚠️ НАЙВАЖЛИВІШІ ПРАВИЛА ТА ВИМОГИ:
1. МОВА ЗАПОВНЕННЯ — СТРОГО УКРАЇНСЬКА!
   - Якщо резюме складено іноземною мовою (англійська, російська, узбецька, турецька, хінді, польська, арабська, бенгальська тощо) — ВСІ текстові поля (професія, посада, навички, мови, водійські права, біографія, опис досвіду, обов'язки, освіта) ПОВИННІ БУТИ ГРАМОТНО ТА ПРОФЕСІЙНО ПЕРЕКЛАДЕНІ НА УКРАЇНСЬКУ МОВУ!
   - ПІБ кандидата: якщо ім'я написано латиницею або іноземною мовою, запиши його українською транслітерацією, а в дужках збережи оригінал, наприклад: "Абдуллаєв Джамшид Баходирович (Abdullaev Jamshid)".
2. НОРМАЛІЗАЦІЯ ТЕЛЕФОНІВ:
   - Форматуй номери у міжнародний стандарт E.164 (+380..., +998..., +91..., +90... тощо).
   - Якщо є окремий номер для WhatsApp — вкажи його, якщо ні — використовуй основний номер.
3. ПРОФЕСІЯ ТА ПОСАДА:
   - Вказуй точну технічну спеціальність українською: напр. "Зварювальник MIG/MAG", "Оператор верстатів з ЧПК", "Водій автонавантажувача", "Арматурник-бетоняр", "Електрик промислового устаткування", "Фасувальник-пакувальник".
4. СТРУКТУРОВАНЕ БІО (BIO):
   - Сформуй чіткий, структурований розділ українською мовою: хронологія останніх місць роботи, ключові виробничі обов'язки, освіта та професійні сертифікати.
5. НАВИЧКИ (SKILLS):
   - Масив конкретних професійних навичок українською (напр. ["Напівавтоматичне зварювання MIG/MAG", "Читання технічних креслень", "Контроль якості швів", "Слюсарна обробка металу"]).

ФОРМАТ ВІДПОВІДІ (СТРОГО ВАЛІДНИЙ JSON БЕЗ ЗАЙВОГО ТЕКСТУ ТА MARKDOWN):
{
  "name": "ПІБ кандидата українською (оригінал латиницею)",
  "country": "Країна походження/проживання (напр. Узбекистан, Індія, Туреччина, Україна)",
  "citizenship": "Громадянство (напр. Узбекистан, Україна)",
  "profession": "Основна спеціальність українською",
  "position": "Бажана або поточна посада українською",
  "phone": "+998901234567",
  "phone2": "",
  "whatsapp": "+998901234567",
  "telegram": "@username",
  "email": "candidate@email.com",
  "experienceYears": 4,
  "salaryExpectation": "€1200 - €1500 / міс",
  "skills": ["навичка 1", "навичка 2", "навичка 3"],
  "languages": "Володіння мовами українською, напр. Англійська (розмовний A2), Узбецька (рідна)",
  "driverLicense": "Категорії водійських прав, напр. B, C, CE або Немає",
  "birthDate": "Дата або рік народження, напр. 1992",
  "bio": "Структурований досвід роботи та освіта українською мовою: останні підприємства, стаж, обов'язки.",
  "status": "Кваліфіковано / Резюме",
  "summary": "Короткий висновок рекрутера про кандидата українською (1-2 речення)",
  "detectedLanguage": "en",
  "wasTranslated": true
}

ТЕКСТ РЕЗЮМЕ ДЛЯ РОЗПІЗНАВАННЯ:
"""
${text}
"""`;

    const { text: aiResponse } = await ModelRouterService.generateContentWithFailover(
      prompt,
      () => JSON.stringify(ResumeParserService.fallbackRegexParser(text))
    );

    try {
      // Clean possible markdown ```json ... ``` tags
      const cleaned = aiResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      // Clean phone numbers
      const cleanPhone = (p?: string) => {
        if (!p) return '';
        const digits = p.replace(/[^\d+]/g, '');
        return digits.startsWith('+') ? digits : `+${digits}`;
      };

      const primaryPhone = cleanPhone(parsed.phone) || '';
      const waPhone = cleanPhone(parsed.whatsapp) || primaryPhone;
      const secPhone = cleanPhone(parsed.phone2) || '';

      const isNonUkrainian = (parsed.detectedLanguage && parsed.detectedLanguage !== 'uk') || 
                            parsed.wasTranslated === true ||
                            /[a-zA-Z]{4,}/.test(text);

      return {
        name: parsed.name || 'Кандидат',
        country: parsed.country || 'Узбекистан',
        citizenship: parsed.citizenship || parsed.country || 'Узбекистан',
        profession: parsed.profession || 'Оператор виробництва',
        position: parsed.position || parsed.profession || 'Оператор виробництва',
        phone: primaryPhone,
        phone2: secPhone,
        whatsapp: waPhone,
        telegram: parsed.telegram || '',
        email: parsed.email || '',
        experienceYears: Number(parsed.experienceYears) >= 0 ? Number(parsed.experienceYears) : 2,
        salaryExpectation: parsed.salaryExpectation || '',
        skills: Array.isArray(parsed.skills) && parsed.skills.length > 0 
          ? parsed.skills 
          : [parsed.profession || 'Спеціаліст', 'Досвід роботи', 'Готовність до виїзду'],
        languages: parsed.languages || '',
        driverLicense: parsed.driverLicense || '',
        birthDate: parsed.birthDate ? String(parsed.birthDate) : '',
        bio: parsed.bio || parsed.summary || '',
        status: parsed.status || 'Кваліфіковано / Резюме',
        summary: parsed.summary || '',
        detectedLanguage: parsed.detectedLanguage || (isNonUkrainian ? 'іноземна' : 'uk'),
        wasTranslated: Boolean(parsed.wasTranslated ?? isNonUkrainian)
      };
    } catch (e) {
      console.warn('AI JSON parsing fallback:', e);
      return ResumeParserService.fallbackRegexParser(text);
    }
  }

  /**
   * Regex-based fallback parser for 100% offline uptime
   */
  public static fallbackRegexParser(text: string): ParsedCandidateData {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || 'Кандидат';

    // Try extracting phone
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{2,4})/);
    const phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, '') : '';

    // Try extracting email
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
    const email = emailMatch ? emailMatch[0] : '';

    // Try extracting telegram
    const tgMatch = text.match(/@([a-zA-Z0-9_]{4,32})/);
    const telegram = tgMatch ? `@${tgMatch[1]}` : '';

    // Detect country
    let country = 'Узбекистан';
    if (/індія|india|хинди|delhi|mumbai/i.test(text)) country = 'Індія';
    else if (/азербайджан|baku|azerbaijan/i.test(text)) country = 'Азербайджан';
    else if (/філіппіни|philippines|manila/i.test(text)) country = 'Філіппіни';
    else if (/туреччина|turkey|türkiye|istanbul/i.test(text)) country = 'Туреччина';
    else if (/бангладеш|bangladesh|dhaka/i.test(text)) country = 'Бангладеш';
    else if (/непал|nepal|kathmandu/i.test(text)) country = 'Непал';
    else if (/україна|украина|ukraine/i.test(text)) country = 'Україна';

    // Detect profession in Ukrainian
    let profession = 'Оператор виробництва';
    if (/звар|weld|mig|mag|tig|свар/i.test(text)) profession = 'Зварювальник MIG/MAG';
    else if (/токар|cnc|чпк|фрезер|верстат|machinist/i.test(text)) profession = 'Оператор верстатів з ЧПК / Токар';
    else if (/карщик|навантажувач|forklift|погрузчик/i.test(text)) profession = 'Водій автонавантажувача';
    else if (/електрик|electric|электрик/i.test(text)) profession = 'Електрик промислового устаткування';
    else if (/арматур|будів|бетон|rebar|construction|строитель/i.test(text)) profession = 'Будівельник-монтажник / Арматурник';
    else if (/водій|driver|водитель|ce|категор/i.test(text)) profession = 'Водій-міжнародник (кат. CE)';
    else if (/пакув|склад|упаков|pack|warehouse/i.test(text)) profession = 'Комплектувальник / Пакувальник складу';

    // Experience
    const expMatch = text.match(/(\d+)\s*(?:років|роки|рік|лет|года|год|years|year|yr|yrs)/i);
    const experienceYears = expMatch ? parseInt(expMatch[1], 10) : 2;

    // Driver license
    let driverLicense = '';
    const licenseMatch = text.match(/(?:права|посвідчення|license|кат\.?|категорія)\s*:?\s*([A-E,\s\+]+)/i);
    if (licenseMatch) driverLicense = licenseMatch[1].trim();

    // Languages
    const languages: string[] = [];
    if (/english|англійськ|английск/i.test(text)) languages.push('Англійська');
    if (/russian|російськ|русск/i.test(text)) languages.push('Російська');
    if (/uzbek|узбек/i.test(text)) languages.push('Узбецька');
    if (/turkish|турецьк|турецк/i.test(text)) languages.push('Турецька');
    if (/hindi|хінді|хинди/i.test(text)) languages.push('Хінді');

    const isNonUk = /[a-zA-Z]{4,}/.test(text) || !/украї/i.test(text);

    return {
      name: firstLine.length < 50 ? firstLine : 'Новий Кандидат',
      country,
      citizenship: country,
      profession,
      position: profession,
      phone: phone.startsWith('+') ? phone : (phone ? `+${phone}` : ''),
      whatsapp: phone.startsWith('+') ? phone : (phone ? `+${phone}` : ''),
      telegram,
      email,
      experienceYears,
      skills: [profession, 'Досвід роботи за фахом', 'Готовність до виїзду та працевлаштування'],
      languages: languages.join(', ') || 'Рідна мова',
      driverLicense,
      bio: text.slice(0, 500),
      status: 'Кваліфіковано / Резюме',
      summary: `Кандидат на посаду ${profession}, країна: ${country}. Досвід: ${experienceYears} р.`,
      detectedLanguage: isNonUk ? 'en' : 'uk',
      wasTranslated: isNonUk
    };
  }
}
