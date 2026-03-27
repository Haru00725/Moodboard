const User = require('../models/User');
const { success, badRequest, forbidden } = require('../utils/apiResponse');
const { CREDITS, ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

// ------------------------------------------------------------------
// GET /api/referral/code  — get user's own invite code
// ------------------------------------------------------------------
const getMyCode = async (req, res, next) => {
  try {
    const user = req.user;

    // Generate one if somehow missing
    if (!user.inviteCode) {
      const { generateInviteCode } = require('../utils/inviteCode');
      user.inviteCode = generateInviteCode();
      await user.save({ validateBeforeSave: false });
    }

    const referralCount = await User.countDocuments({ referredBy: user._id });

    return success(res, {
      inviteCode: user.inviteCode,
      referralCount,
      creditsEarnedFromReferrals: referralCount * CREDITS.REFERRAL_BONUS,
      bonusPerReferral: CREDITS.REFERRAL_BONUS,
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/referral/use  — apply an invite code post-signup
// ------------------------------------------------------------------
const useReferralCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const user = req.user;

    if (user.hasUsedReferral) {
      return forbidden(
        res,
        'You have already used a referral code.',
        ERROR_CODES.INVITE_CODE_ALREADY_USED
      );
    }

    const code = inviteCode.toUpperCase().trim();

    // Can't use your own code
    if (user.inviteCode === code) {
      return badRequest(res, 'You cannot use your own invite code.', ERROR_CODES.INVITE_CODE_INVALID);
    }

    const referrer = await User.findOne({ inviteCode: code });
    if (!referrer) {
      return badRequest(res, 'Invalid invite code.', ERROR_CODES.INVITE_CODE_INVALID);
    }

    // Grant bonus credits to both parties
    await Promise.all([
      User.findByIdAndUpdate(user._id, {
        $inc: { credits: CREDITS.REFERRAL_BONUS },
        $set: {
          referredBy: referrer._id,
          referralCodeUsed: code,
          hasUsedReferral: true,
        },
      }),
      User.findByIdAndUpdate(referrer._id, {
        $inc: { credits: CREDITS.REFERRAL_BONUS },
      }),
    ]);

    logger.info('Referral code applied', {
      userId: user._id,
      referrerId: referrer._id,
      code,
    });

    return success(res, {
      creditsAdded: CREDITS.REFERRAL_BONUS,
      message: `You and ${referrer.name} both received ${CREDITS.REFERRAL_BONUS} bonus credits!`,
    }, 'Referral code applied successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyCode, useReferralCode };
