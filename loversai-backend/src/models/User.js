const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { PLANS, CREDITS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      // NOT required — Google users won't have a password
      minlength: 8,
      select: false,
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    plan: {
      type: String,
      enum: Object.values(PLANS),
      default: PLANS.FREE,
    },
    credits: {
      type: Number,
      default: CREDITS.FREE_INITIAL,
      min: 0,
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    referralCodeUsed: {
      type: String,
      default: null,
    },
    hasUsedReferral: {
      type: Boolean,
      default: false,
    },
    lastCreditReset: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving (only if password is set)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user has credits available
userSchema.methods.hasCredits = function () {
  if (this.plan === PLANS.PRO_PLUS) return true;
  return this.credits > 0;
};

// Deduct one credit
userSchema.methods.deductCredit = async function () {
  if (this.plan === PLANS.PRO_PLUS) return true;
  if (this.credits <= 0) return false;
  this.credits -= 1;
  await this.save();
  return true;
};

// Add credits
userSchema.methods.addCredits = async function (amount) {
  this.credits += amount;
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
