const { PLANS, ERROR_CODES } = require('../config/constants');
const { forbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * checkCredits middleware factory
 * @param {boolean} isFreeStage — skip credit check for entry stage
 */
const checkCredits = (isFreeStage = false) => async (req, res, next) => {
  const user = req.user;

  // PRO_PLUS = unlimited
  if (user.plan === PLANS.PRO_PLUS) return next();

  // Entry stage is always free for the first time
  if (isFreeStage) return next();

  // Check monthly PRO credits
  if (user.plan === PLANS.PRO) {
    // Reset monthly credits if a month has passed
    const now = new Date();
    const lastReset = new Date(user.lastCreditReset);
    const monthPassed =
      now.getFullYear() > lastReset.getFullYear() ||
      now.getMonth() > lastReset.getMonth();

    if (monthPassed) {
      const { CREDITS } = require('../config/constants');
      user.credits = CREDITS.PRO_MONTHLY;
      user.lastCreditReset = now;
      await user.save();
    }
  }

  if (user.credits <= 0) {
    logger.warn('Credit check failed', { userId: user._id, plan: user.plan });
    return forbidden(
      res,
      'You have no credits remaining. Please upgrade your plan or wait for monthly reset.',
      ERROR_CODES.INSUFFICIENT_CREDITS
    );
  }

  next();
};

/**
 * checkPlan middleware factory
 * Ensures the user is on at least a certain plan tier
 */
const requirePlan = (...requiredPlans) => (req, res, next) => {
  if (requiredPlans.includes(req.user.plan)) return next();

  return forbidden(
    res,
    `This feature requires one of the following plans: ${requiredPlans.join(', ')}`,
    ERROR_CODES.PLAN_UPGRADE_REQUIRED
  );
};

/**
 * Prevent concurrent generation on the same moodboard
 */
const preventDuplicateGeneration = (req, res, next) => {
  const moodboard = req.moodboard;
  if (!moodboard) return next();

  if (moodboard.isGenerating) {
    return res.status(409).json({
      success: false,
      message: 'Generation already in progress for this moodboard.',
      code: ERROR_CODES.DUPLICATE_REQUEST,
    });
  }

  next();
};

module.exports = { checkCredits, requirePlan, preventDuplicateGeneration };
