const logger = require('../utils/logger');

/**
 * Central error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
    userId: req.user?._id,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('; '),
      code: 'VALIDATION_ERROR',
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      code: 'INVALID_ID',
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      success: false,
      message: `${field || 'Field'} already exists`,
      code: 'DUPLICATE_ENTRY',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'UNAUTHORIZED',
    });
  }

  // Custom app errors
  const knownCodes = {
    AI_SERVICE_ERROR: 503,
    AI_TIMEOUT: 504,
    INSUFFICIENT_CREDITS: 403,
    PLAN_UPGRADE_REQUIRED: 403,
    INVALID_STAGE: 400,
    DUPLICATE_REQUEST: 409,
    INVALID_IMAGE: 400,
  };

  if (err.code && knownCodes[err.code]) {
    return res.status(knownCodes[err.code]).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Fallback
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : err.message,
    code: err.code || 'SERVER_ERROR',
  });
};

/**
 * 404 handler — must be registered AFTER all routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
};

module.exports = { errorHandler, notFoundHandler };
