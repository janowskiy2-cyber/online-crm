import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints:
 * Max 5 failed attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    error: 'Забагато спроб входу. З міркувань безпеки ваш IP тимчасово заблоковано на 15 хвилин.'
  }
});

/**
 * General rate limiter for general API routes:
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
