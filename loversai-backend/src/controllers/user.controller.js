const User = require('../models/User');
const Moodboard = require('../models/Moodboard');
const bcrypt = require('bcryptjs');
const { success, notFound, badRequest, unauthorized } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ------------------------------------------------------------------
// GET /api/user/profile
// ------------------------------------------------------------------
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('referredBy', 'name email');

    if (!user) return notFound(res, 'User not found');

    const moodboardCount = await Moodboard.countDocuments({ userId: user._id });

    return success(res, {
      user: {
        ...user.toJSON(),
        moodboardCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/user/credits
// ------------------------------------------------------------------
const getCredits = async (req, res, next) => {
  try {
    const user = req.user;

    return success(res, {
      credits: user.credits,
      plan: user.plan,
      isUnlimited: user.plan === 'PRO_PLUS',
      lastCreditReset: user.lastCreditReset,
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// PATCH /api/user/profile
// ------------------------------------------------------------------
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, name: nameField } = req.body;
    const newName = displayName || nameField;

    if (!newName || typeof newName !== 'string') {
      return badRequest(res, 'Display name is required');
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: newName.trim() },
      { new: true, runValidators: true }
    );

    if (!user) return notFound(res, 'User not found');

    return success(res, { user }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/user/change-password
// ------------------------------------------------------------------
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return badRequest(res, 'Current and new passwords are required');
    }

    if (newPassword.length < 8) {
      return badRequest(res, 'New password must be at least 8 characters');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return notFound(res, 'User not found');

    // Google-only users may not have a password
    if (!user.password) {
      return badRequest(res, 'Cannot change password for Google-authenticated accounts');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return unauthorized(res, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    logger.info('Password changed', { userId: user._id });

    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// DELETE /api/user/account
// ------------------------------------------------------------------
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) return notFound(res, 'User not found');

    // Verify password if user has one (skip for Google users)
    if (user.password) {
      if (!password) {
        return badRequest(res, 'Password is required to delete your account');
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return unauthorized(res, 'Incorrect password');
      }
    }

    // Delete user's moodboards
    await Moodboard.deleteMany({ userId: user._id });

    // Delete user
    await User.findByIdAndDelete(user._id);

    logger.info('Account deleted', { userId: user._id });

    return success(res, null, 'Account deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, getCredits, updateProfile, changePassword, deleteAccount };
