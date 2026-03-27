const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getPaymentHistory } = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All payment routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/payment/create-order
 * @desc    Create a Razorpay payment order
 */
router.post('/create-order', createOrder);

/**
 * @route   POST /api/payment/verify
 * @desc    Verify Razorpay payment
 */
router.post('/verify', verifyPayment);

/**
 * @route   GET /api/payment/history
 * @desc    Get user's payment history
 */
router.get('/history', getPaymentHistory);

module.exports = router;
