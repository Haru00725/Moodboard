const express = require('express');
const router = express.Router();
const { register, login, googleAuth, logout } = require('../controllers/auth.controller');
const { validate, registerSchema, loginSchema } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimit.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginSchema), login);

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate via Google
 * @access  Public
 */
router.post('/google', authLimiter, googleAuth);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (no-op for JWT)
 * @access  Public
 */
router.post('/logout', logout);

module.exports = router;
