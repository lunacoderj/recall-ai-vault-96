/**
 * AppError — creates structured errors that the global error handler
 * will format correctly into { success: false, message, code }.
 *
 * Usage anywhere in controllers:
 *   throw new AppError('Record not found', 404, 'RECORD_NOT_FOUND');
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
