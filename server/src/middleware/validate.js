const { validationResult } = require('express-validator');

/**
 * Middleware to check validation results from express-validator
 * and return consistent 400 errors.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return res.status(400).json({
      success: false,
      message: messages.join('. '),
      code: 'VALIDATION_ERROR',
      errors: errors.array(),
    });
  }
  next();
};

module.exports = { validate };
