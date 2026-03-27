const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min

const createLimiter = (options) =>
  rateLimit({
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.',
        code: 'RATE_LIMITED',
      });
    },
    ...options,
  });

// General API rate limit
const generalLimiter = createLimiter({
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
});

// Strict limiter for auth endpoints
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts from this IP',
});

// AI generation limiter (expensive operations)
const aiLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  skip: (req) => req.user?.plan === 'PRO_PLUS', // skip for unlimited plan
});

// Upload limiter
const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

module.exports = { generalLimiter, authLimiter, aiLimiter, uploadLimiter };
