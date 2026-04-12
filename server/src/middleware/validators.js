const { body, param } = require('express-validator');

// ─── Auth Validators ─────────────────────────────────

/** Used by POST /api/auth/firebase */
const firebaseAuthValidator = [
  body('idToken')
    .notEmpty()
    .withMessage('Firebase ID token is required')
    .isString()
    .withMessage('Firebase ID token must be a string'),
];

/** Used by POST /api/auth/refresh-token */
const refreshTokenValidator = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

// ─── Record Validators ───────────────────────────────

const addRecordValidator = [
  body('contentType')
    .isIn(['link', 'pdf', 'note', 'video', 'document'])
    .withMessage('contentType must be: link | pdf | note | video | document'),
  body('rawContent')
    .optional()
    .isString()
    .withMessage('rawContent must be a string'),
  body('url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('fileText')
    .optional()
    .isString()
    .withMessage('fileText must be a string'),
];

const recordIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid record ID format'),
];

// ─── Search Validator ────────────────────────────────

const searchValidator = [
  body('query')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be 1–500 characters'),
];

// ─── API Key Validator ───────────────────────────────

const apiKeyValidator = [
  body('apiKey')
    .notEmpty()
    .withMessage('apiKey is required')
    .isString()
    .withMessage('apiKey must be a string'),
  body('aiProvider')
    .optional()
    .isIn(['gemini', 'openai'])
    .withMessage('aiProvider must be gemini or openai'),
];

// ─── Profile Validator ───────────────────────────────

const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Bio must be under 300 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username can only contain lowercase letters, numbers, and underscores'),
];

module.exports = {
  firebaseAuthValidator,
  refreshTokenValidator,
  addRecordValidator,
  recordIdValidator,
  searchValidator,
  apiKeyValidator,
  updateProfileValidator,
};
