import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // 10 failed attempts per minute per IP
  skipSuccessfulRequests: true, // Successful logins never count towards the limit
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Забагато невдалих спроб входу. Зачекайте 1 хвилину перед наступною спробою.'
  }
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Перевищено ліміт запитів до API. Спробуйте пізніше.'
  }
});

export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // Limit to 30 leads/minute per IP to prevent spam and DB bloating
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Забагато запитів лідогенерації. Спробуйте пізніше.'
  }
});
