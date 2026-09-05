import { ModelRouterService } from './model-router.service';

/**
 * Common recruitment & B2B CRM domain synonyms (Synaptic Dictionary)
 * Provides instant 0ms expansion for core industry professions and CRM terms
 */
const DOMAIN_SYNAPSE_MAP: Record<string, string[]> = {
  // Welding / Металообробка
  'сварщик': ['зварювальник', 'сварка', 'mig', 'mag', 'tig', 'аргонник', 'welder'],
  'зварювальник': ['сварщик', 'сварка', 'mig', 'mag', 'tig', 'аргонник', 'welder'],
  'welder': ['зварювальник', 'сварщик', 'mig', 'mag', 'tig'],

  // Drivers / Логістика
  'водитель': ['водій', 'шофер', 'карщик', 'навантажувач', 'driver', 'кат. c', 'кат. e', 'дальнобойщик'],
  'водій': ['водитель', 'шофер', 'карщик', 'навантажувач', 'driver', 'кат. c', 'кат. e'],
  'карщик': ['водитель погрузчика', 'водій навантажувача', 'штабелер', 'ричтрак', 'forklift'],
  'навантажувач': ['погрузчик', 'карщик', 'forklift'],

  // Construction / Будівництво
  'строитель': ['будівельник', 'арматурник', 'бетонщик', 'монтажник', 'муляр', 'каменщик', 'опалубщик'],
  'будівельник': ['строитель', 'арматурник', 'бетонщик', 'монтажник', 'муляр', 'каменщик'],
  'арматурщик': ['арматурник', 'бетонщик', 'монолитчик'],
  'арматурник': ['арматурщик', 'бетонщик', 'монолітник'],
  'электрик': ['електрик', 'електромонтажник', 'електромонтер', 'electrician'],
  'електрик': ['электрик', 'електромонтажник', 'electrician'],

  // Warehouse / Склад & Виробництво
  'разнорабочий': ['різноробочий', 'підсобник', 'фасовщик', 'пакувальник', 'грузчик', 'вантажник', 'склад'],
  'різноробочий': ['разнорабочий', 'підсобник', 'фасувальник', 'пакувальник', 'вантажник', 'склад'],
  'упаковщик': ['пакувальник', 'фасовщик', 'фасувальник', 'склад', 'комплектовщик', 'стикеровщик'],
  'пакувальник': ['упаковщик', 'фасувальник', 'фасовщик', 'комплектувальник', 'стікерувальник'],
  'швея': ['швачка', 'закрійник', 'текстиль', 'seamstress'],
  'швачка': ['швея', 'закрійник', 'текстиль'],
  'повар': ['кухар', 'кулінар', 'помічник кухаря', 'cook', 'chef'],
  'кухар': ['повар', 'кулінар', 'cook'],

  // CRM Stages & Terms
  'кп': ['комерційна пропозиція', 'коммерческое предложение', 'пропозиція', 'розрахунок', 'кошторис'],
  'договор': ['договір', 'контракт', 'угода', 'підписання', 'contract'],
  'договір': ['договор', 'контракт', 'угода', 'підписання', 'contract'],
  'оплата': ['рахунок', 'транш', 'аванс', 'інвойс', 'платіж', 'invoice', '25%'],
  'отказ': ['відмова', 'програно', 'втрачено', 'неактуально', 'lost'],
  'відмова': ['отказ', 'програно', 'втрачено', 'неактуально', 'lost']
};

interface CacheEntry {
  synonyms: string[];
  expiresAt: number;
}

export class SemanticSearchService {
  private static cache = new Map<string, CacheEntry>();
  private static CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

  /**
   * Expands user search query with semantic synapses, synonyms, and variations
   * using fast Gemini Flash Lite + static industry dictionary + TTL in-memory cache.
   */
  public static async expandQuery(rawQuery: string): Promise<string[]> {
    if (!rawQuery || !rawQuery.trim()) return [];

    const query = rawQuery.trim().toLowerCase();
    const resultTerms = new Set<string>([query]);

    // Split compound queries into words
    const words = query.split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      resultTerms.add(w);
    }

    // 1. Check in-memory cache
    const cached = this.cache.get(query);
    if (cached && cached.expiresAt > Date.now()) {
      for (const syn of cached.synonyms) {
        resultTerms.add(syn);
      }
      return Array.from(resultTerms);
    }

    // 2. Add domain synapses from static dictionary
    for (const [key, synList] of Object.entries(DOMAIN_SYNAPSE_MAP)) {
      if (query.includes(key) || key.includes(query)) {
        for (const s of synList) {
          resultTerms.add(s.toLowerCase());
        }
      }
    }

    // Also check individual words against static dictionary
    for (const word of words) {
      const match = DOMAIN_SYNAPSE_MAP[word];
      if (match) {
        for (const s of match) {
          resultTerms.add(s.toLowerCase());
        }
      }
    }

    // 3. AI Query Expansion via Gemini Flash-Lite (Fast, lightweight, free-tier)
    // Only query if query is meaningful (>2 chars) and not purely numeric
    if (query.length >= 3 && !/^\+?\d+$/.test(query)) {
      try {
        const prompt = `Ти — синаптичний пошуковий модуль CRM системи міжнародного рекрутингу та B2B продажів.
Користувач ввів пошуковий запит: "${query}".
Склади список із 4-8 близьких синонімів, професійних назв, пов'язаних спеціальностей або перекладів (українською, російською та англійською мовами).
Поверни ВИКЛЮЧНО валідний JSON-масив рядків без форматування та пояснень.
Приклад: ["зварювальник", "сварщик", "mig/mag", "welder"]`;

        const aiResponse = await Promise.race([
          ModelRouterService.generateContentWithFailover(prompt, () => '[]'),
          new Promise<{ text: string; modelUsed: string }>((resolve) =>
            setTimeout(() => resolve({ text: '[]', modelUsed: 'timeout' }), 900)
          )
        ]);

        if (aiResponse && aiResponse.text && aiResponse.text !== '[]') {
          const cleaned = aiResponse.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (typeof item === 'string' && item.trim().length > 1) {
                resultTerms.add(item.trim().toLowerCase());
              }
            }
          }
        }
      } catch (err: any) {
        // Non-blocking fallback: static synapses are already included
      }
    }

    const finalArray = Array.from(resultTerms).slice(0, 12); // Limit to top 12 synapses

    // Save to cache
    this.cache.set(query, {
      synonyms: finalArray,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });

    return finalArray;
  }
}
