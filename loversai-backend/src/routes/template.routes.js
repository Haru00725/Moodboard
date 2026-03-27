const express = require('express');
const router = express.Router();
const { getTemplates, getTemplate, purchaseTemplate, verifyTemplatePurchase } = require('../controllers/template.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/templates
 * @desc    List all active templates
 * @access  Private
 */
router.get('/', authenticate, getTemplates);

/**
 * @route   GET /api/templates/:id
 * @desc    Get a single template
 */
router.get('/:id', getTemplate);

/**
 * @route   POST /api/templates/:id/purchase
 * @desc    Create Razorpay order for template purchase
 * @access  Private
 */
router.post('/:id/purchase', authenticate, purchaseTemplate);

/**
 * @route   POST /api/templates/:id/verify-payment
 * @desc    Verify Razorpay payment for template
 * @access  Private
 */
router.post('/:id/verify-payment', authenticate, verifyTemplatePurchase);

module.exports = router;
