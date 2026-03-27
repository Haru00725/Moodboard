/**
 * Standardized API response helpers
 */

const success = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const created = (res, data = {}, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'An error occurred', code = 'SERVER_ERROR', statusCode = 500, details = null) => {
  const payload = {
    success: false,
    message,
    code,
  };
  if (details && process.env.NODE_ENV !== 'production') {
    payload.details = details;
  }
  return res.status(statusCode).json(payload);
};

const badRequest = (res, message = 'Bad request', code = 'VALIDATION_ERROR', details = null) =>
  error(res, message, code, 400, details);

const unauthorized = (res, message = 'Unauthorized') =>
  error(res, message, 'UNAUTHORIZED', 401);

const forbidden = (res, message = 'Forbidden', code = 'FORBIDDEN') =>
  error(res, message, code, 403);

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 'NOT_FOUND', 404);

const tooManyRequests = (res, message = 'Too many requests') =>
  error(res, message, 'RATE_LIMITED', 429);

const serviceUnavailable = (res, message = 'AI service unavailable') =>
  error(res, message, 'AI_SERVICE_ERROR', 503);

module.exports = {
  success,
  created,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  serviceUnavailable,
};
