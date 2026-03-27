const mongoose = require('mongoose');
const { STAGES, MOODBOARD_STATUS } = require('../config/constants');

const stageDataSchema = new mongoose.Schema(
  {
    images: [{ type: String }],          // generated image URLs
    selectedImage: { type: String, default: null },
    generatedAt: { type: Date },
    prompt: { type: String },
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending',
    },
    retryCount: { type: Number, default: 0 },
    error: { type: String, default: null },
  },
  { _id: false }
);

const moodboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Uploaded file URLs
    venueImageUrl: { type: String, default: null },
    designImageUrl: { type: String, default: null },

    // User-given title
    title: { type: String, default: '', maxlength: 200 },

    // Wedding detail selections from sidebar
    functionType: { type: String, default: '' },   // Haldi, Mehendi, Sangeet, Shaadi, Reception
    theme: { type: String, default: '' },           // Royal, Minimal, Boho, Traditional, Pastel, Art Deco
    celebrationType: { type: String, default: '' }, // Palace, Banquet, Open Lawn, Resort, Beach, Heritage Haveli
    timeOfDay: { type: String, default: '' },       // Daytime, Nighttime, Golden Hour, Twilight

    // Descriptions of uploaded reference images (for prompt context)
    venueDescription: { type: String, default: '', maxlength: 2000 },
    decorDescription: { type: String, default: '', maxlength: 2000 },

    // Master prompt from user (vibe text)
    basePrompt: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    colorDirection: { type: String, maxlength: 200, default: '' },

    // All 5 stages
    stages: {
      entry:  { type: stageDataSchema, default: () => ({}) },
      lounge: { type: stageDataSchema, default: () => ({}) },
      dining: { type: stageDataSchema, default: () => ({}) },
      bar:    { type: stageDataSchema, default: () => ({}) },
      stage:  { type: stageDataSchema, default: () => ({}) },
    },

    // Current active stage
    currentStage: {
      type: String,
      enum: STAGES,
      default: 'entry',
    },

    // Completed stage list
    completedStages: {
      type: [String],
      default: [],
    },

    // Final assembled moodboard image URLs
    finalMoodboard: {
      type: [String],
      default: [],
    },

    // Logo added by user
    logo: {
      type: String,
      default: null,
    },

    // Overall status
    status: {
      type: String,
      enum: Object.values(MOODBOARD_STATUS),
      default: MOODBOARD_STATUS.IN_PROGRESS,
    },

    // Lock flag to prevent duplicate concurrent requests
    isGenerating: {
      type: Boolean,
      default: false,
    },
    generatingStage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

moodboardSchema.index({ userId: 1, createdAt: -1 });

// Check if a stage can be generated
moodboardSchema.methods.canGenerateStage = function (stageName) {
  const stageOrder = ['entry', 'lounge', 'dining', 'bar', 'stage'];
  const idx = stageOrder.indexOf(stageName);
  if (idx === 0) return true; // Entry always allowed
  const prevStage = stageOrder[idx - 1];
  return this.completedStages.includes(prevStage);
};

// Mark stage as complete (image selected)
moodboardSchema.methods.completeStage = async function (stageName, imageUrl) {
  this.stages[stageName].selectedImage = imageUrl;
  this.stages[stageName].status = 'completed';

  if (!this.completedStages.includes(stageName)) {
    this.completedStages.push(stageName);
  }

  const stageOrder = ['entry', 'lounge', 'dining', 'bar', 'stage'];
  const idx = stageOrder.indexOf(stageName);
  if (idx < stageOrder.length - 1) {
    this.currentStage = stageOrder[idx + 1];
  } else {
    // All stages done
    this.status = MOODBOARD_STATUS.COMPLETED;
    this.finalMoodboard = stageOrder
      .map((s) => this.stages[s].selectedImage)
      .filter(Boolean);
  }

  await this.save();
};

module.exports = mongoose.model('Moodboard', moodboardSchema);
