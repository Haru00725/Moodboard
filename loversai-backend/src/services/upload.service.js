const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;
const ALLOWED_TYPES = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',');

// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

['venue', 'design', 'logos'].forEach((sub) =>
  ensureDir(path.join(UPLOAD_DIR, sub))
);

// ------------------------------------------------------------------
// Storage engine
// ------------------------------------------------------------------

const createStorage = (subDir) =>
  multer.diskStorage({
    destination(req, file, cb) {
      const dest = path.join(UPLOAD_DIR, subDir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = `${req.user._id}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, unique);
    },
  });

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error(`Unsupported file type: ${file.mimetype}`), {
        code: 'INVALID_IMAGE',
      }),
      false
    );
  }
};

// ------------------------------------------------------------------
// Multer instances
// ------------------------------------------------------------------

const venueUpload = multer({
  storage: createStorage('venue'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const designUpload = multer({
  storage: createStorage('design'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const logoUpload = multer({
  storage: createStorage('logos'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Accepts both venue + design in one request
const moodboardUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const subDir = file.fieldname === 'logo' ? 'logos' : file.fieldname;
      const dest = path.join(UPLOAD_DIR, subDir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = `${req.user._id}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, unique);
    },
  }),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ------------------------------------------------------------------
// Utility: Convert local path → public URL
// ------------------------------------------------------------------

const toPublicUrl = (filePath) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');
  return `${baseUrl}/${normalized}`;
};

// ------------------------------------------------------------------
// Utility: Delete uploaded file (cleanup on error)
// ------------------------------------------------------------------

const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.warn(`Failed to delete file: ${filePath}`, { error: err.message });
  }
};

// ------------------------------------------------------------------
// Multer error handler middleware
// ------------------------------------------------------------------

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Max size: ${process.env.MAX_FILE_SIZE_MB || 10}MB`,
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'UPLOAD_ERROR',
    });
  }

  if (err?.code === 'INVALID_IMAGE') {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'INVALID_IMAGE',
    });
  }

  next(err);
};

module.exports = {
  venueUpload,
  designUpload,
  logoUpload,
  moodboardUpload,
  toPublicUrl,
  deleteFile,
  handleUploadError,
};
