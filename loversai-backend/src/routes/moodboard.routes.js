const express = require('express');
const router = express.Router();

const {
  startMoodboard,
  generateStage,
  selectImage,
  getMoodboard,
  addLogo,
  downloadMoodboard,
  listMoodboards,
  updateTitle,
  deleteMoodboard,
} = require('../controllers/moodboard.controller');

const { authenticate } = require('../middleware/auth.middleware');
const { checkCredits, preventDuplicateGeneration } = require('../middleware/credits.middleware');
const { aiLimiter, uploadLimiter } = require('../middleware/rateLimit.middleware');
const { validate, startMoodboardSchema, generateStageSchema, selectImageSchema } = require('../utils/validators');
const { moodboardUpload, logoUpload, handleUploadError } = require('../services/upload.service');

// All moodboard routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/moodboard
 * @desc    List user's moodboards (paginated)
 * @access  Private
 */
router.get('/', listMoodboards);

/**
 * @route   POST /api/moodboard/start
 * @desc    Create a new moodboard with optional file uploads
 * @access  Private
 */
router.post(
  '/start',
  uploadLimiter,
  moodboardUpload.fields([
    { name: 'venue', maxCount: 1 },
    { name: 'design', maxCount: 1 },
  ]),
  handleUploadError,
  validate(startMoodboardSchema),
  startMoodboard
);

/**
 * @route   POST /api/moodboard/:id/generate-stage
 * @desc    Generate AI images for a specific stage
 * @access  Private
 */
router.post(
  '/:id/generate-stage',
  aiLimiter,
  validate(generateStageSchema),
  generateStage
);

/**
 * @route   POST /api/moodboard/:id/select-image
 * @desc    Select one image from a generated stage
 * @access  Private
 */
router.post(
  '/:id/select-image',
  validate(selectImageSchema),
  selectImage
);

/**
 * @route   GET /api/moodboard/:id
 * @desc    Get a specific moodboard
 * @access  Private
 */
router.get('/:id', getMoodboard);

/**
 * @route   PATCH /api/moodboard/:id/title
 * @desc    Update moodboard title
 * @access  Private
 */
router.patch('/:id/title', updateTitle);

/**
 * @route   DELETE /api/moodboard/:id
 * @desc    Delete a moodboard
 * @access  Private
 */
router.delete('/:id', deleteMoodboard);

/**
 * @route   POST /api/moodboard/:id/add-logo
 * @desc    Upload and attach a logo to a moodboard
 * @access  Private
 */
router.post(
  '/:id/add-logo',
  uploadLimiter,
  logoUpload.single('logo'),
  handleUploadError,
  addLogo
);

/**
 * @route   GET /api/moodboard/:id/download
 * @desc    Download the completed moodboard data
 * @access  Private
 */
router.get('/:id/download', downloadMoodboard);

module.exports = router;
