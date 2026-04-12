const logger = require('../config/logger');

/**
 * 404 handler – route not found.
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
};

/**
 * Global error handler middleware.
 * Must have 4 params for Express to recognise it as error middleware.
 */
const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message || err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. '),
      code: 'VALIDATION_ERROR',
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    return res.status(409).json({
      success: false,
      message: `Duplicate value for: ${field}`,
      code: 'DUPLICATE_KEY',
    });
  }

  // Mongoose cast error (bad ObjectId etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for ${err.path}: ${err.value}`,
      code: 'CAST_ERROR',
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.',
      code: 'FILE_TOO_LARGE',
    });
  }

  // Default
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
    code: err.code || 'INTERNAL_ERROR',
  });
};

module.exports = { errorHandler, notFoundHandler };
