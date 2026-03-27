const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { unauthorized } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Verify JWT and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorized(res, 'Token expired. Please log in again.');
      }
      return unauthorized(res, 'Invalid token');
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return unauthorized(res, 'User no longer exists');
    }

    if (!user.isActive) {
      return unauthorized(res, 'Account is deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Generate a signed JWT
 */
const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = { authenticate, signToken };
