const express = require('express');
const router = express.Router();
const { getProfile, getCredits, updateProfile, changePassword, deleteAccount } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/user/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', getProfile);

/**
 * @route   PATCH /api/user/profile
 * @desc    Update user profile (displayName)
 * @access  Private
 */
router.patch('/profile', updateProfile);

/**
 * @route   GET /api/user/credits
 * @desc    Get current user's credit balance
 * @access  Private
 */
router.get('/credits', getCredits);

/**
 * @route   POST /api/user/change-password
 * @desc    Change user's password
 * @access  Private
 */
router.post('/change-password', changePassword);

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', deleteAccount);

module.exports = router;
