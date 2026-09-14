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

export interface ParseResumeOptions {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
}

export class ResumeParserService {
  private static getBasePrompt(): string {
    return `Ти — провідний експертний AI-парсер та лінгвістичний перекладач резюме (CV) міжнародного рекрутингового агентства Recruiter I Club.
Твоє завдання — УВАЖНО прочитати наданий документ або текст резюме кандидата, витягнути ВСІ реальні фактичні дані та повернути СТРОГО валідний JSON об'єкт для CRM-системи.

⚠️ СТРОГІ ПРАВИЛА:
1. МОВА ЗАПОВНЕННЯ — СТРОГО УКРАЇНСЬКА!
   - Якщо резюме складено будь-якою іноземною мовою (англійська, російська, узбецька, турецька, хінді, польська, німецька, бенгальська тощо) — ВСІ текстові поля (професія, посада, навички, мови, водійські права, біографія, опис досвіду, обов'язки, освіта) ПОВИННІ БУТИ ГРАМОТНО ТА ПРОФЕСІЙНО ПЕРЕКЛАДЕНІ НА УКРАЇНСЬКУ МОВУ!
   - ПІБ кандидата: якщо ім'я написано латиницею або іноземною мовою, запиши його українською транслітерацією з оригіналом у дужках, наприклад: "Абдуллаєв Джамшид Баходирович (Abdullaev Jamshid)". Не вигадуй імена — бери реальне ім'я з документу!
2. НОРМАЛІЗАЦІЯ ТЕЛЕФОНІВ ТА КОНТАКТІВ:
   - Шукай реальні номери телефонів у документі. Форматуй у міжнародний стандарт E.164 (+380..., +998..., +91... тощо).
   - Шукай окремий WhatsApp номер, Telegram або Email.
3. ПРОФЕСІЯ ТА СПЕЦІАЛЬНІСТЬ:
   - Визнач точну професію кандидата українською мовою: напр. "Зварювальник MIG/MAG", "Оператор верстатів з ЧПК", "Водій автонавантажувача", "Арматурник-бетоняр", "Електрик промислового устаткування", "Кухар-універсал", "Комплектувальник складу".
4. СТРУКТУРОВАНЕ БІО (BIO) ТА ДОСВІД:
   - Опиши хронологію реального досвіду роботи кандидата українською мовою: де працював (компанії, роки), які функції виконував, яку освіту має.
5. НАВИЧКИ (SKILLS):
   - Масив конкретних професійних навичок українською мовою.

ФОРМАТ ВІДПОВІДІ (СТРОГО ВАЛІДНИЙ JSON БЕЗ ЗАЙВОГО ТЕКСТУ ТА MARKDOWN):
{
  "name": "ПІБ кандидата українською (оригінал латиницею)",
  "country": "Країна походження/проживання кандидата (напр. Узбекистан, Індія, Туреччина, Україна)",
  "citizenship": "Громадянство кандидата",
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
  "driverLicense": "Категорії водійських прав (напр. B, C, CE або Немає)",
  "birthDate": "Дата або рік народження (напр. 1993)",
  "bio": "Структурований опис досвіду роботи та освіти українською мовою: останні підприємства, стаж, обов'язки.",
  "status": "Кваліфіковано / Резюме",
  "summary": "Короткий висновок рекрутера про кандидата українською (1-2 речення)",
  "detectedLanguage": "en",
  "wasTranslated": true
}`;
  }

  /**
   * Main entry point: parses resume from either fileBase64 (PDF/images/text) or direct text string
   */
  public static async parseResume(options: ParseResumeOptions | string): Promise<ParsedCandidateData> {
    const opts: ParseResumeOptions = typeof options === 'string' ? { text: options } : options;
    const text = (opts.text || '').trim();
    const fileBase64 = (opts.fileBase64 || '').trim();
    let mimeType = opts.mimeType || 'application/pdf';
    const fileName = opts.fileName || '';

    // If file is plain text, decode to string and run text parser
    if (fileBase64 && (mimeType.includes('text') || fileName.endsWith('.txt'))) {
      try {
        const cleanB64 = fileBase64.replace(/^data:.*?,/, '').replace(/^data:.*?;base64,/, '').trim();
        const decodedText = Buffer.from(cleanB64, 'base64').toString('utf-8');
        if (decodedText && decodedText.length > 10) {
          return ResumeParserService.parseResumeText(decodedText);
        }
      } catch (e) {
        console.warn('Failed to decode base64 text file:', e);
      }
    }

    // Multimodal parsing: if PDF, PNG, JPG, WEBP base64 is provided, pass directly to Gemini
    if (fileBase64) {
      const cleanB64 = fileBase64.replace(/^data:.*?,/, '').replace(/^data:.*?;base64,/, '').trim();
      if (cleanB64.length > 50) {
        // Resolve precise mimeType
        if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (fileName.endsWith('.png')) mimeType = 'image/png';
        else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (fileName.endsWith('.webp')) mimeType = 'image/webp';

        const prompt = `${ResumeParserService.getBasePrompt()}
${text ? `\nДодатковий супровідний текст від рекрутера:\n"""\n${text}\n"""` : ''}`;

        const contents = [
          prompt,
          {
            inlineData: {
              data: cleanB64,
              mimeType
            }
          }
        ];

        try {
          const { text: aiResponse } = await ModelRouterService.generateMediaContentWithFailover(
            contents,
            () => JSON.stringify(ResumeParserService.fallbackRegexParser(text || fileName))
          );
          return ResumeParserService.cleanAndFormatResponse(aiResponse, text || fileName);
        } catch (mediaErr) {
          console.warn('Media resume parsing failed, falling back to text parsing:', mediaErr);
        }
      }
    }

    // Default: text-only parsing
    return ResumeParserService.parseResumeText(text || fileName || 'Кандидат');
  }

  /**
   * Parse resume text using Gemini AI with automatic translation to Ukrainian
   */
  public static async parseResumeText(text: string): Promise<ParsedCandidateData> {
    const prompt = `${ResumeParserService.getBasePrompt()}

ТЕКСТ РЕЗЮМЕ ДЛЯ РОЗПІЗНАВАННЯ:
"""
${text}
"""`;

    const { text: aiResponse } = await ModelRouterService.generateContentWithFailover(
      prompt,
      () => JSON.stringify(ResumeParserService.fallbackRegexParser(text))
    );

    return ResumeParserService.cleanAndFormatResponse(aiResponse, text);
  }

  /**
   * Parse and format AI response to validated candidate data
   */
  private static cleanAndFormatResponse(aiResponse: string, originalContent: string): ParsedCandidateData {
    try {
      const cleaned = aiResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

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
                            /[a-zA-Z]{4,}/.test(originalContent);

      return {
        name: parsed.name || 'Новий Кандидат',
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
      return ResumeParserService.fallbackRegexParser(originalContent);
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
