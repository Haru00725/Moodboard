const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
  name: Joi.string().trim().min(2).max(80).required().messages({
    'any.required': 'Name is required',
  }),
  inviteCode: Joi.string().uppercase().trim().optional().allow(''),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

const startMoodboardSchema = Joi.object({
  prompt: Joi.string().trim().min(3).max(1000).required().messages({
    'string.min': 'Prompt must be at least 3 characters',
    'any.required': 'A vibe prompt is required',
  }),
  colorDirection: Joi.string().trim().max(200).optional().allow(''),
  functionType: Joi.string().trim().max(50).optional().allow(''),
  theme: Joi.string().trim().max(50).optional().allow(''),
  celebrationType: Joi.string().trim().max(50).optional().allow(''),
  timeOfDay: Joi.string().trim().max(50).optional().allow(''),
});

const generateStageSchema = Joi.object({
  stage: Joi.string()
    .valid('entry', 'lounge', 'dining', 'bar', 'stage')
    .required()
    .messages({
      'any.only': 'Stage must be one of: entry, lounge, dining, bar, stage',
      'any.required': 'Stage is required',
    }),
  prompt: Joi.string().trim().min(3).max(1000).optional().allow(''),
  venueImageBase64: Joi.string().max(20_000_000).optional().allow('', null),
  decorImageBase64: Joi.string().max(20_000_000).optional().allow('', null),
  functionType: Joi.string().trim().max(50).optional().allow(''),
  theme: Joi.string().trim().max(50).optional().allow(''),
  celebrationType: Joi.string().trim().max(50).optional().allow(''),
  timeOfDay: Joi.string().trim().max(50).optional().allow(''),
  vibeDescription: Joi.string().trim().max(1000).optional().allow(''),
});

const selectImageSchema = Joi.object({
  stage: Joi.string()
    .valid('entry', 'lounge', 'dining', 'bar', 'stage')
    .required(),
  imageUrl: Joi.string().uri().required().messages({
    'string.uri': 'imageUrl must be a valid URL',
    'any.required': 'imageUrl is required',
  }),
});

const useReferralSchema = Joi.object({
  inviteCode: Joi.string().trim().uppercase().required().messages({
    'any.required': 'Invite code is required',
  }),
});

/**
 * Middleware factory for validating request body
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message).join('; ');
    return res.status(400).json({
      success: false,
      message: messages,
      code: 'VALIDATION_ERROR',
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  startMoodboardSchema,
  generateStageSchema,
  selectImageSchema,
  useReferralSchema,
};
