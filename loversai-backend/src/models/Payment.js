const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['subscription', 'template'], required: true },
    plan: { type: String, default: '' },                // PRO, PRO_PLUS (for subscriptions)
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
