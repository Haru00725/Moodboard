const express = require('express');
const router = express.Router();
const { getMyCode, useReferralCode } = require('../controllers/referral.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, useReferralSchema } = require('../utils/validators');

router.use(authenticate);

/**
 * @route   GET /api/referral/code
 * @desc    Get the current user's invite/referral code
 * @access  Private
 */
router.get('/code', getMyCode);

/**
 * @route   POST /api/referral/use
 * @desc    Apply a referral code to get bonus credits
 * @access  Private
 */
router.post('/use', validate(useReferralSchema), useReferralCode);

module.exports = router;
