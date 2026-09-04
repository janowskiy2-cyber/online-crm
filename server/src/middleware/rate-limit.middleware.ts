import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints (login & admin PIN verification):
 * Max 5 attempts per 1 minute per IP.
 * If 5 failed attempts occur within 1 minute, IP is blocked for 1 minute.
 * Successful logins do not penalize the user (skipSuccessfulRequests: true).
 */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Only failed attempts consume the quota
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    error: 'Забагато невдалих спроб входу (5 з 5). Будь ласка, зачекайте 1 хвилину перед наступною спробою.'
  }
});

/**
 * General rate limiter for API routes:
 * Max 300 requests per minute per IP to prevent scraping / DDOS.
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Перевищено ліміт запитів до API. Спробуйте пізніше.'
  }
});
