const User = require('../models/User');
const { signToken } = require('../middleware/auth.middleware');
const { generateInviteCode } = require('../utils/inviteCode');
const { success, created, badRequest, unauthorized } = require('../utils/apiResponse');
const { CREDITS } = require('../config/constants');
const logger = require('../utils/logger');

// ------------------------------------------------------------------
// POST /api/auth/register
// ------------------------------------------------------------------
const register = async (req, res, next) => {
  try {
    const { email, password, name, inviteCode } = req.body;

    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return badRequest(res, 'An account with this email already exists', 'DUPLICATE_ENTRY');
    }

    // Handle referral code
    let referredBy = null;
    let referralCodeUsed = null;

    if (inviteCode) {
      const referrer = await User.findOne({ inviteCode: inviteCode.toUpperCase() });
      if (!referrer) {
        return badRequest(res, 'Invalid invite code', 'INVITE_CODE_INVALID');
      }
      referredBy = referrer._id;
      referralCodeUsed = inviteCode.toUpperCase();
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      inviteCode: generateInviteCode(),
      referredBy,
      referralCodeUsed,
      hasUsedReferral: !!inviteCode,
      credits: inviteCode
        ? CREDITS.FREE_INITIAL + CREDITS.REFERRAL_BONUS
        : CREDITS.FREE_INITIAL,
    });

    // Give referrer bonus credits too
    if (referredBy) {
      await User.findByIdAndUpdate(referredBy, {
        $inc: { credits: CREDITS.REFERRAL_BONUS },
      });
      logger.info('Referral bonus granted', { referrerId: referredBy });
    }

    const token = signToken(user._id);

    logger.info('User registered', { userId: user._id, email: user.email });

    return created(res, { token, user }, 'Account created successfully');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------------
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return unauthorized(res, 'Invalid email or password');
    }

    if (!user.isActive) {
      return unauthorized(res, 'Account has been deactivated');
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    // Remove password from response
    user.password = undefined;

    logger.info('User logged in', { userId: user._id });

    return success(res, { token, user }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/auth/google
// ------------------------------------------------------------------
const googleAuth = async (req, res, next) => {
  try {
    const { email, googleId, name, avatar, idToken } = req.body;

    if (!email || !googleId) {
      return badRequest(res, 'Email and Google ID are required');
    }

    // Find existing user by email or googleId
    let user = await User.findOne({
      $or: [{ email }, { googleId }],
    });

    if (user) {
      // Update Google ID and avatar if needed
      if (!user.googleId) user.googleId = googleId;
      if (avatar && !user.avatar) user.avatar = avatar;
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      // Create new user (no password for Google auth)
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar: avatar || '',
        inviteCode: generateInviteCode(),
        credits: CREDITS.FREE_INITIAL,
      });
      logger.info('Google user registered', { userId: user._id, email });
    }

    if (!user.isActive) {
      return unauthorized(res, 'Account has been deactivated');
    }

    const token = signToken(user._id);

    return success(res, { token, user }, 'Google authentication successful');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/auth/logout
// ------------------------------------------------------------------
const logout = async (req, res, next) => {
  try {
    // JWT-based auth — nothing to invalidate server-side
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, googleAuth, logout };
