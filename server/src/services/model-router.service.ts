import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ModelQuotaState {
  id: string;
  name: string;
  rpmLimit: number;
  rpdLimit: number;
  currentRpd: number;
  activeRpm: number;
  isExhausted: boolean;
  lastUsedAt?: string;
  lastError?: string;
}

export class ModelRouterService {
  private static apiKey = process.env.GEMINI_API_KEY || '';
  private static genAI = new GoogleGenerativeAI(ModelRouterService.apiKey || 'AIzaSyA_Placeholder');
  
  // Last reset date (YYYY-MM-DD)
  private static lastResetDate: string = ModelRouterService.getTodayDateString();

  // Model cascade list in priority order (Total capacity: 7,500+ free requests/day)
  private static models: {
    id: string;
    name: string;
    rpmLimit: number;
    rpdLimit: number;
    currentRpd: number;
    rpmWindow: number[];
    isExhausted: boolean;
    lastUsedAt?: string;
    lastError?: string;
  }[] = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', rpmLimit: 15, rpdLimit: 1500, currentRpd: 0, rpmWindow: [], isExhausted: false },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', rpmLimit: 15, rpdLimit: 1500, currentRpd: 0, rpmWindow: [], isExhausted: false },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', rpmLimit: 15, rpdLimit: 1500, currentRpd: 0, rpmWindow: [], isExhausted: false },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', rpmLimit: 15, rpdLimit: 1500, currentRpd: 0, rpmWindow: [], isExhausted: false },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', rpmLimit: 15, rpdLimit: 1500, currentRpd: 0, rpmWindow: [], isExhausted: false },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', rpmLimit: 2, rpdLimit: 50, currentRpd: 0, rpmWindow: [], isExhausted: false }
  ];

  static {
    // Check midnight reset every 60 seconds
    setInterval(() => {
      ModelRouterService.checkMidnightReset();
    }, 60 * 1000);
  }

  public static updateApiKey(key: string) {
    ModelRouterService.apiKey = key;
    ModelRouterService.genAI = new GoogleGenerativeAI(key);
  }

  private static getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Daily Midnight Reset:
   * Google AI Studio resets quotas at midnight PST.
   * This resets all daily usage counters and unblocks exhausted models every 24h.
   */
  public static checkMidnightReset() {
    const today = ModelRouterService.getTodayDateString();
    if (today !== ModelRouterService.lastResetDate) {
      console.log(`🔄 [ModelRouter] Daily Midnight Reset triggered! (Old: ${ModelRouterService.lastResetDate} -> New: ${today})`);
      ModelRouterService.lastResetDate = today;
      for (const m of ModelRouterService.models) {
        m.currentRpd = 0;
        m.isExhausted = false;
        m.rpmWindow = [];
        m.lastError = undefined;
      }
      console.log('✅ [ModelRouter] All model quotas refreshed to 100% capacity (7,500+ free requests renewed)!');
    }
  }

  /**
   * Cleans old requests from the 60-second rolling window
   */
  private static cleanRpmWindow(m: typeof ModelRouterService.models[0]) {
    const now = Date.now();
    m.rpmWindow = m.rpmWindow.filter(t => now - t < 60 * 1000);
  }

  /**
   * Smart Execution with Multi-Model Failover:
   * Loops through models. If a model hits RPM or RPD or returns 429,
   * it silently cascades to the next model in the tier.
   */
  public static async generateContentWithFailover(
    prompt: string,
    fallbackFn: () => string
  ): Promise<{ text: string; modelUsed: string }> {
    ModelRouterService.checkMidnightReset();

    const apiKey = process.env.GEMINI_API_KEY || ModelRouterService.apiKey;
    if (!apiKey) {
      return { text: fallbackFn(), modelUsed: 'Smart Recruiter Core (Offline Engine)' };
    }

    const now = Date.now();

    for (const m of ModelRouterService.models) {
      ModelRouterService.cleanRpmWindow(m);

      // Check if model reached daily quota
      if (m.isExhausted || m.currentRpd >= m.rpdLimit) {
        continue;
      }

      // Proactive RPM avoidance: if near RPM limit, jump to next model to prevent 429
      if (m.rpmWindow.length >= m.rpmLimit) {
        console.warn(`[ModelRouter] Model ${m.id} reached RPM limit (${m.rpmWindow.length}/${m.rpmLimit}). Proactively routing to next model...`);
        continue;
      }

      try {
        const modelInstance = ModelRouterService.genAI.getGenerativeModel({ model: m.id });
        const result = await modelInstance.generateContent(prompt);
        const text = result.response.text();

        // Successful call: update counters
        m.currentRpd += 1;
        m.rpmWindow.push(now);
        m.lastUsedAt = new Date().toISOString();

        return { text, modelUsed: m.name };
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.warn(`[ModelRouter] Model ${m.id} returned error: ${errMsg}. Cascading to next model...`);

        m.lastError = errMsg;

        // If error is 429 / Resource Exhausted / Quota, mark exhausted for today
        if (errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          m.isExhausted = true;
          console.warn(`[ModelRouter] ⛔ Model ${m.id} quota reached. Disabled until next daily midnight reset.`);
        }

        // Continue loop to try next model
      }
    }

    // If all models in the cascade failed or hit limits, use smart recruiter engine
    console.warn('[ModelRouter] All online models temporarily busy or exhausted. Using Smart Recruiter Core engine.');
    return {
      text: fallbackFn(),
      modelUsed: 'Smart Recruiter Core (Offline Backup)'
    };
  }

  /**
   * Get live status of all models for dashboard / diagnostics
   */
  public static getModelsStatus(): {
    today: string;
    models: ModelQuotaState[];
    totalRemainingToday: number;
  } {
    ModelRouterService.checkMidnightReset();

    const result: ModelQuotaState[] = ModelRouterService.models.map(m => {
      ModelRouterService.cleanRpmWindow(m);
      return {
        id: m.id,
        name: m.name,
        rpmLimit: m.rpmLimit,
        rpdLimit: m.rpdLimit,
        currentRpd: m.currentRpd,
        activeRpm: m.rpmWindow.length,
        isExhausted: m.isExhausted,
        lastUsedAt: m.lastUsedAt,
        lastError: m.lastError
      };
    });

    const totalRemaining = ModelRouterService.models.reduce((sum, m) => {
      return sum + (m.isExhausted ? 0 : Math.max(0, m.rpdLimit - m.currentRpd));
    }, 0);

    return {
      today: ModelRouterService.lastResetDate,
      models: result,
      totalRemainingToday: totalRemaining
    };
  }
}
