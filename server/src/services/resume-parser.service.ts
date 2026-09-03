import { ModelRouterService } from './model-router.service';

export interface ParsedCandidateData {
  name: string;
  country: string;
  profession: string;
  phone?: string;
  experienceYears?: number;
  skills?: string[];
  status: string;
  summary?: string;
}

export class ResumeParserService {
  /**
   * Parse resume text or structured document using Gemini AI
   */
  public static async parseResumeText(text: string): Promise<ParsedCandidateData> {
    const prompt = `Ти — експертний AI-парсер резюме для міжнародного рекрутингового агентства.
Твоє завдання — проаналізувати текст резюме кандидата та повернути ВИНЯТКОВО валідний JSON без зайвих слів і markdown-блоків.

Формат JSON:
{
  "name": "ПІБ кандидата",
  "country": "Країна походження (Узбекистан, Індія, Азербайджан, Філіппіни, Україна тощо)",
  "profession": "Основна спеціальність (напр. Зварювальник MIG/MAG, Оператор верстата, Карщик, Будівельник)",
  "phone": "Номер телефону якщо є, інакше порожньо",
  "experienceYears": 3,
  "skills": ["навичка 1", "навичка 2"],
  "status": "Кваліфіковано / Резюме",
  "summary": "Короткий опис досвіду (1-2 речення)"
}

Текст резюме:
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
      return {
        name: parsed.name || 'Кандидат',
        country: parsed.country || 'Узбекистан',
        profession: parsed.profession || 'Спеціаліст',
        phone: parsed.phone || '',
        experienceYears: Number(parsed.experienceYears) || 1,
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        status: parsed.status || 'Кваліфіковано / Резюме',
        summary: parsed.summary || ''
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
    const phone = phoneMatch ? phoneMatch[0] : '';

    // Detect country
    let country = 'Узбекистан';
    if (/індія|india|хинди/i.test(text)) country = 'Індія';
    else if (/азербайджан|baku|azerbaijan/i.test(text)) country = 'Азербайджан';
    else if (/філіппіни|philippines|manila/i.test(text)) country = 'Філіппіни';
    else if (/україна|украина|ukraine/i.test(text)) country = 'Україна';

    // Detect profession
    let profession = 'Оператор виробництва';
    if (/звар|weld|mig|mag|tig/i.test(text)) profession = 'Зварювальник MIG/MAG';
    else if (/токар|cnc|фрезер|верстат/i.test(text)) profession = 'Оператор верстатів ЧПК / Токар';
    else if (/карщик|навантажувач|forklift/i.test(text)) profession = 'Водій навантажувача';
    else if (/електрик|electric/i.test(text)) profession = 'Електрик промисловий';
    else if (/арматур|будів|бетон/i.test(text)) profession = 'Будівельник-монтажник';

    return {
      name: firstLine.length < 50 ? firstLine : 'Новий Кандидат',
      country,
      profession,
      phone,
      experienceYears: 2,
      skills: [profession, 'Досвід роботи', 'Готовність до виїзду'],
      status: 'Кваліфіковано / Резюме',
      summary: `Кандидат на посаду ${profession}, країна: ${country}.`
    };
  }
}
