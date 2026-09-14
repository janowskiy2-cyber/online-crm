interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * In-Memory LRU & TTL Cache for Gemini AI Responses
 * Prevents redundant API roundtrips, optimizes free-tier RPM/TPM quota,
 * and speeds up repeat queries from ~1500ms to <1ms.
 */
export class AiCacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly MAX_ENTRIES = 500;
  private static readonly DEFAULT_TTL_MS = 20 * 60 * 1000; // 20 minutes

  /**
   * Normalize input to create a consistent deterministic cache key
   */
  public static makeKey(prefix: string, payload: any): string {
    const serialized = typeof payload === 'string' 
      ? payload.trim().toLowerCase() 
      : JSON.stringify(payload);
    return `${prefix}:${serialized}`;
  }

  public static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order: delete and re-insert
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  public static set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    // Evict oldest if exceeding capacity
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  public static stats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.MAX_ENTRIES
    };
  }

  public static clear(): void {
    this.cache.clear();
  }
}
