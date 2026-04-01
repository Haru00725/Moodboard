const Template = require('../models/Template');
const Payment = require('../models/Payment');
const User = require('../models/User');
const crypto = require('crypto');
const { success, created, badRequest, notFound, serviceUnavailable } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Razorpay config (optional — works without real keys in dev mode)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// ------------------------------------------------------------------
// GET /api/templates — List all active templates
// ------------------------------------------------------------------
const getTemplates = async (req, res, next) => {
  try {
    const { theme, style } = req.query;
    const filter = { isActive: true };
    if (theme) filter.theme = theme;
    if (style) filter.functionType = style;

    const templates = await Template.find(filter)
      .sort({ purchaseCount: -1, createdAt: -1 })
      .lean();

    // Check which templates the user has purchased
    let purchasedIds = [];
    if (req.user) {
      const payments = await Payment.find({
        user: req.user._id,
        type: 'template',
        status: 'paid',
      }).select('templateId').lean();
      purchasedIds = payments.map((p) => p.templateId?.toString());
    }

    const result = templates.map((t) => ({
      ...t,
      isPurchased: purchasedIds.includes(t._id.toString()),
    }));

    return success(res, { templates: result });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/templates/:id — Get single template
// ------------------------------------------------------------------
const getTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id).lean();
    if (!template) return notFound(res, 'Template not found');
    return success(res, { template });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/templates/:id/purchase — Create Razorpay order for template
// ------------------------------------------------------------------
const purchaseTemplate = async (req, res, next) => {
  try {
    logger.info('Purchase request received', { templateId: req.params.id, userId: req.user?._id });

    // Validate user
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    const template = await Template.findById(req.params.id);
    if (!template) return notFound(res, 'Template not found');

    // Check if already purchased
    const existingPayment = await Payment.findOne({
      user: req.user._id,
      templateId: template._id,
      status: 'paid',
    });
    if (existingPayment) {
      return badRequest(res, 'You have already purchased this template');
    }

    const amountInPaise = template.price * 100;

    // If Razorpay is configured, create real order
    let orderId;
    if (RAZORPAY_KEY_SECRET && RAZORPAY_KEY_ID !== 'rzp_test_placeholder') {
      const Razorpay = require('razorpay');
      const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: template.currency || 'INR',
        receipt: `tpl_${template._id}_${Date.now()}`,
      });
      orderId = order.id;
    } else {
      // Dev mode: generate mock order ID
      orderId = `order_dev_${crypto.randomBytes(12).toString('hex')}`;
    }

    // Save payment record
    await Payment.create({
      user: req.user._id,
      type: 'template',
      templateId: template._id,
      amount: template.price,
      currency: template.currency || 'INR',
      status: 'created',
      razorpayOrderId: orderId,
    });

    logger.info('Template purchase order created', {
      userId: req.user._id,
      templateId: template._id,
      orderId,
    });

    return success(res, {
      orderId,
      amount: amountInPaise,
      currency: template.currency || 'INR',
      razorpayKeyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    logger.error('Purchase template error', { error: err.message, stack: err.stack, templateId: req.params.id });
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/templates/:id/verify-payment — Verify Razorpay signature
// ------------------------------------------------------------------
const verifyTemplatePurchase = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return badRequest(res, 'Missing payment details');
    }

    const payment = await Payment.findOne({
      razorpayOrderId,
      user: req.user._id,
      type: 'template',
    });
    if (!payment) return notFound(res, 'Payment record not found');

    // Verify signature if Razorpay is configured
    if (RAZORPAY_KEY_SECRET && RAZORPAY_KEY_ID !== 'rzp_test_placeholder') {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        payment.status = 'failed';
        await payment.save();
        return badRequest(res, 'Payment verification failed — invalid signature');
      }
    }

    // Mark payment as paid
    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature || 'dev_mode';
    await payment.save();

    // Increment template purchase count
    await Template.findByIdAndUpdate(payment.templateId, { $inc: { purchaseCount: 1 } });

    const template = await Template.findById(payment.templateId).lean();

    logger.info('Template purchase verified', {
      userId: req.user._id,
      templateId: payment.templateId,
      paymentId: razorpayPaymentId,
    });

    return success(res, { template }, 'Template purchased successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  purchaseTemplate,
  verifyTemplatePurchase,
};
