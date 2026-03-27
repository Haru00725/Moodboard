const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const moodboardRoutes = require('./moodboard.routes');
const referralRoutes = require('./referral.routes');
const templateRoutes = require('./template.routes');
const paymentRoutes = require('./payment.routes');

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/moodboard', moodboardRoutes);
router.use('/referral', referralRoutes);
router.use('/templates', templateRoutes);
router.use('/payment', paymentRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LoversAI API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

module.exports = router;
