const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = format;

// ─── Custom Log Format ──────────────────────────────
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// ─── Logger Instance ─────────────────────────────────
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  defaultMeta: { service: 'recallai-api' },
  transports: [
    // Console (colorized for dev)
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),
    // File – Error level
    new transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880,  // 5MB
      maxFiles: 5,
    }),
    // File – Combined
    new transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

module.exports = logger;
