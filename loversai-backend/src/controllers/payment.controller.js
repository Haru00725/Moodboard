const Payment = require('../models/Payment');
const User = require('../models/User');
const crypto = require('crypto');
const { success, badRequest, notFound } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Plan pricing (in INR)
const PLAN_PRICES = {
  PRO: 999,
  PRO_PLUS: 4999,
};

const PLAN_CREDITS = {
  PRO: parseInt(process.env.PRO_PLAN_CREDITS) || 3,
  PRO_PLUS: 999999, // Unlimited
};

// ------------------------------------------------------------------
// POST /api/payment/create-order — Create Razorpay order
// ------------------------------------------------------------------
const createOrder = async (req, res, next) => {
  try {
    const { type, plan, templateId } = req.body;

    if (!type || !['subscription', 'template'].includes(type)) {
      return badRequest(res, 'Invalid payment type');
    }

    let amount = 0;
    if (type === 'subscription') {
      if (!plan || !PLAN_PRICES[plan]) {
        return badRequest(res, 'Invalid plan');
      }
      amount = PLAN_PRICES[plan];
    }

    const amountInPaise = amount * 100;

    let orderId;
    if (RAZORPAY_KEY_SECRET && RAZORPAY_KEY_ID !== 'rzp_test_placeholder') {
      const Razorpay = require('razorpay');
      const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `${type}_${plan || templateId}_${Date.now()}`,
      });
      orderId = order.id;
    } else {
      orderId = `order_dev_${crypto.randomBytes(12).toString('hex')}`;
    }

    await Payment.create({
      user: req.user._id,
      type,
      plan: plan || '',
      templateId: templateId || null,
      amount,
      currency: 'INR',
      status: 'created',
      razorpayOrderId: orderId,
    });

    logger.info('Payment order created', { userId: req.user._id, type, plan, orderId });

    return success(res, {
      orderId,
      amount: amountInPaise,
      currency: 'INR',
      razorpayKeyId: RAZORPAY_KEY_ID,
      prefill: {
        name: req.user.name || req.user.displayName || '',
        email: req.user.email || '',
      },
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/payment/verify — Verify Razorpay payment
// ------------------------------------------------------------------
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return badRequest(res, 'Missing payment details');
    }

    const payment = await Payment.findOne({
      razorpayOrderId,
      user: req.user._id,
    });
    if (!payment) return notFound(res, 'Payment not found');

    // Verify signature if Razorpay is configured
    if (RAZORPAY_KEY_SECRET && RAZORPAY_KEY_ID !== 'rzp_test_placeholder') {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        payment.status = 'failed';
        await payment.save();
        return badRequest(res, 'Payment verification failed');
      }
    }

    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature || 'dev_mode';
    await payment.save();

    // If subscription, upgrade user plan + credits
    if (payment.type === 'subscription' && payment.plan) {
      const credits = PLAN_CREDITS[payment.plan] || 0;
      await User.findByIdAndUpdate(req.user._id, {
        plan: payment.plan,
        credits,
      });
      logger.info('User plan upgraded', { userId: req.user._id, plan: payment.plan, credits });
    }

    const user = await User.findById(req.user._id).select('-password').lean();

    return success(res, { payment, user }, 'Payment verified successfully');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/payment/history — Get user's payment history
// ------------------------------------------------------------------
const getPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('templateId', 'title theme')
      .lean();

    return success(res, { payments });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
};
