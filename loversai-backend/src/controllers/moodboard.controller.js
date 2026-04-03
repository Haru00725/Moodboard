const Moodboard = require('../models/Moodboard');
const User = require('../models/User');
const aiService = require('../services/ai.service');
const { toPublicUrl, deleteFile } = require('../services/upload.service');
const { success, created, badRequest, notFound, forbidden, serviceUnavailable } = require('../utils/apiResponse');
const { STAGES, STAGE_ORDER, PLANS, ERROR_CODES, IMAGES_PER_STAGE } = require('../config/constants');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// ------------------------------------------------------------------
// Helper: read an uploaded image file → base64 string
// ------------------------------------------------------------------
const fileToBase64 = (filePath) => {
  try {
    // filePath could be a public URL like http://localhost:5000/uploads/...
    // Convert it back to a local path
    let localPath = filePath;
    if (localPath.startsWith('http')) {
      // Strip the base URL prefix to get relative path
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      localPath = localPath.replace(baseUrl + '/', '');
    }
    // Resolve to absolute path
    if (!path.isAbsolute(localPath)) {
      localPath = path.join(process.cwd(), localPath);
    }
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath).toString('base64');
    }
  } catch (err) {
    logger.warn('Failed to read image file for base64 conversion', { filePath, error: err.message });
  }
  return null;
};

// ------------------------------------------------------------------
// POST /api/moodboard/start
// ------------------------------------------------------------------
const startMoodboard = async (req, res, next) => {
  try {
    const { prompt, colorDirection, functionType, theme, celebrationType, timeOfDay } = req.body;
    const userId = req.user._id;

    let venueImageUrl = null;
    let designImageUrl = null;

    if (req.files?.venue?.[0]) {
      venueImageUrl = toPublicUrl(req.files.venue[0].path);
    }
    if (req.files?.design?.[0]) {
      designImageUrl = toPublicUrl(req.files.design[0].path);
    }

    const moodboard = await Moodboard.create({
      userId,
      basePrompt: prompt || 'Beautiful wedding decoration',
      colorDirection: colorDirection || '',
      venueImageUrl,
      designImageUrl,
      functionType: functionType || '',
      theme: theme || '',
      celebrationType: celebrationType || '',
      timeOfDay: timeOfDay || '',
    });

    logger.info('Moodboard created', { moodboardId: moodboard._id, userId, functionType, theme, celebrationType });

    return created(res, { moodboard }, 'Moodboard started successfully');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/moodboard/:id/generate-stage
// ------------------------------------------------------------------
const generateStage = async (req, res, next) => {
  const { id } = req.params;
  const {
    stage,
    venueImageBase64: bodyVenueBase64,
    decorImageBase64: bodyDecorBase64,
    functionType: bodyFunctionType,
    theme: bodyTheme,
    celebrationType: bodyCelebrationType,
    timeOfDay: bodyTimeOfDay,
    vibeDescription: bodyVibeDescription,
    prompt: bodyPrompt,
  } = req.body;
  const user = req.user;

  let moodboard;

  try {
    moodboard = await Moodboard.findOne({ _id: id, userId: user._id });
    if (!moodboard) return notFound(res, 'Moodboard not found');

    // Validate stage order
    if (!moodboard.canGenerateStage(stage)) {
      return badRequest(
        res,
        `You must complete previous stages before generating "${stage}".`,
        ERROR_CODES.INVALID_STAGE
      );
    }

    // Prevent duplicate concurrent generation
    if (moodboard.isGenerating && moodboard.generatingStage === stage) {
      return res.status(409).json({
        success: false,
        message: 'Generation already in progress for this stage.',
        code: ERROR_CODES.DUPLICATE_REQUEST,
      });
    }

    // ── Credit Logic ──
    // First complete moodboard is FREE (all 5 stages).
    // Check how many completed moodboards this user has.
    const completedMoodboardCount = await Moodboard.countDocuments({
      userId: user._id,
      status: 'COMPLETED',
    });
    const isFirstMoodboard = completedMoodboardCount === 0;

    // Also check: is this current moodboard the user's first in-progress one?
    // If we already have a completed moodboard, then this generation costs credits.
    const isFreeGeneration = isFirstMoodboard;

    if (!isFreeGeneration) {
      if (user.plan !== PLANS.PRO_PLUS && user.credits <= 0) {
        return forbidden(
          res,
          'Insufficient credits. Please upgrade your plan.',
          ERROR_CODES.INSUFFICIENT_CREDITS
        );
      }
    }

    // Lock moodboard for generation
    moodboard.isGenerating = true;
    moodboard.generatingStage = stage;
    moodboard.stages[stage].status = 'generating';
    moodboard.stages[stage].retryCount = (moodboard.stages[stage].retryCount || 0) + 1;
    await moodboard.save();

    // ── Build moodboardConfig for the new AI service ──
    // Per-stage overrides from request body take priority over global moodboard settings
    const functionType = bodyFunctionType || moodboard.functionType || '';
    const theme = bodyTheme || moodboard.theme || '';
    const celebrationType = bodyCelebrationType || moodboard.celebrationType || '';
    const timeOfDay = bodyTimeOfDay || moodboard.timeOfDay || '';
    const vibeDescription = bodyVibeDescription || bodyPrompt || moodboard.basePrompt || '';

    // Get base64 images: prefer per-stage uploads from body, fallback to moodboard-level uploads
    let venueImageBase64 = bodyVenueBase64 || null;
    let decorImageBase64 = bodyDecorBase64 || null;

    if (!venueImageBase64 && moodboard.venueImageUrl) {
      venueImageBase64 = fileToBase64(moodboard.venueImageUrl);
    }
    if (!decorImageBase64 && moodboard.designImageUrl) {
      decorImageBase64 = fileToBase64(moodboard.designImageUrl);
    }

    const moodboardConfig = {
      stage,
      functionType,
      theme,
      celebrationType,
      timeOfDay,
      vibeDescription,
      venueImageBase64,
      decorImageBase64,
    };

    // Deduct credit (non-free generations)
    if (!isFreeGeneration && user.plan !== PLANS.PRO_PLUS) {
      await User.findByIdAndUpdate(user._id, { $inc: { credits: -1 } });
      logger.info('Credit deducted', { userId: user._id, stage, remaining: user.credits - 1 });
    }

    // Generate images via Groq + Flux pipeline
    const generatedImages = await aiService.generateImages(moodboardConfig, IMAGES_PER_STAGE);

    // Save results — generatedImages is [{url, label}, ...]
    moodboard.stages[stage].images = generatedImages;
    moodboard.stages[stage].prompt = vibeDescription;
    moodboard.stages[stage].generatedAt = new Date();
    moodboard.stages[stage].status = 'completed';
    moodboard.stages[stage].error = null;
    moodboard.isGenerating = false;
    moodboard.generatingStage = null;

    await moodboard.save();

    logger.info('Stage generated', { moodboardId: id, stage, imageCount: generatedImages.length });

    return success(res, {
      stage,
      images: generatedImages,
      moodboardId: moodboard._id,
    }, `Stage "${stage}" generated successfully`);

  } catch (err) {
    // Release lock on failure
    if (moodboard) {
      try {
        moodboard.isGenerating = false;
        moodboard.generatingStage = null;
        if (moodboard.stages[req.body.stage]) {
          moodboard.stages[req.body.stage].status = 'failed';
          moodboard.stages[req.body.stage].error = err.message;
        }
        await moodboard.save();
      } catch (saveErr) {
        logger.error('Failed to release moodboard lock', { error: saveErr.message });
      }
    }

    if (err.code === 'AI_TIMEOUT') {
      return res.status(504).json({
        success: false,
        message: 'AI generation timed out. Please try again.',
        code: 'AI_TIMEOUT',
      });
    }

    if (err.code === 'AI_SERVICE_ERROR' || err.code === 'AI_RATE_LIMITED' || err.code === 'AI_CONFIG_ERROR') {
      return serviceUnavailable(res, `AI service error: ${err.message}`);
    }

    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/moodboard/:id/select-image
// ------------------------------------------------------------------
const selectImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, imageUrl } = req.body;

    const moodboard = await Moodboard.findOne({ _id: id, userId: req.user._id });
    if (!moodboard) return notFound(res, 'Moodboard not found');

    const stageData = moodboard.stages[stage];
    if (!stageData || stageData.images.length === 0) {
      return badRequest(res, `Stage "${stage}" has not been generated yet.`, ERROR_CODES.INVALID_STAGE);
    }

    // Images can be {url, label} objects or plain strings
    const imageUrls = stageData.images.map((img) =>
      typeof img === 'string' ? img : img.url
    );

    if (!imageUrls.includes(imageUrl)) {
      return badRequest(res, 'The selected image URL does not belong to this stage.', ERROR_CODES.INVALID_IMAGE);
    }

    await moodboard.completeStage(stage, imageUrl);

    logger.info('Image selected', { moodboardId: id, stage, imageUrl });

    return success(res, {
      stage,
      selectedImage: imageUrl,
      nextStage: moodboard.currentStage,
      completedStages: moodboard.completedStages,
      isComplete: moodboard.status === 'COMPLETED',
    }, `Image selected for stage "${stage}"`);
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/moodboard/:id
// ------------------------------------------------------------------
const getMoodboard = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!moodboard) return notFound(res, 'Moodboard not found');

    return success(res, { moodboard });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/moodboard/:id/add-logo
// ------------------------------------------------------------------
const addLogo = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!moodboard) return notFound(res, 'Moodboard not found');

    if (!req.file) {
      return badRequest(res, 'No logo file uploaded', 'MISSING_FILE');
    }

    // Delete old logo if exists
    if (moodboard.logo) {
      const oldPath = moodboard.logo
        .replace(process.env.BASE_URL + '/', '')
        .replace('http://localhost:5000/', '');
      deleteFile(oldPath);
    }

    moodboard.logo = toPublicUrl(req.file.path);
    await moodboard.save();

    logger.info('Logo added', { moodboardId: moodboard._id });

    return success(res, { logoUrl: moodboard.logo }, 'Logo added successfully');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/moodboard/:id/download
// ------------------------------------------------------------------
const downloadMoodboard = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!moodboard) return notFound(res, 'Moodboard not found');

    if (moodboard.status !== 'COMPLETED') {
      return badRequest(
        res,
        'Moodboard is not complete yet. Select images for all stages first.',
        ERROR_CODES.STAGE_NOT_COMPLETE
      );
    }

    const downloadData = {
      moodboardId: moodboard._id,
      createdAt: moodboard.createdAt,
      basePrompt: moodboard.basePrompt,
      colorDirection: moodboard.colorDirection,
      finalMoodboard: moodboard.finalMoodboard,
      logo: moodboard.logo,
      stages: STAGES.reduce((acc, s) => {
        acc[s] = {
          selectedImage: moodboard.stages[s].selectedImage,
          generatedAt: moodboard.stages[s].generatedAt,
        };
        return acc;
      }, {}),
    };

    logger.info('Moodboard downloaded', { moodboardId: moodboard._id });

    return success(res, { moodboard: downloadData }, 'Moodboard ready for download');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/moodboard (list user's moodboards)
// ------------------------------------------------------------------
const listMoodboards = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const [moodboards, total] = await Promise.all([
      Moodboard.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-stages.entry.images -stages.lounge.images -stages.dining.images -stages.bar.images -stages.stage.images'),
      Moodboard.countDocuments({ userId: req.user._id }),
    ]);

    return success(res, {
      moodboards,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// PATCH /api/moodboard/:id/title
// ------------------------------------------------------------------
const updateTitle = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return badRequest(res, 'Title is required');
    }

    const moodboard = await Moodboard.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: title.trim() },
      { new: true }
    );

    if (!moodboard) return notFound(res, 'Moodboard not found');

    return success(res, { moodboard }, 'Title updated');
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// DELETE /api/moodboard/:id
// ------------------------------------------------------------------
const deleteMoodboard = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!moodboard) return notFound(res, 'Moodboard not found');

    logger.info('Moodboard deleted', { moodboardId: req.params.id });

    return success(res, null, 'Moodboard deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startMoodboard,
  generateStage,
  selectImage,
  getMoodboard,
  addLogo,
  downloadMoodboard,
  listMoodboards,
  updateTitle,
  deleteMoodboard,
};
