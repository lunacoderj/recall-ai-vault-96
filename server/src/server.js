require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

// ─── Graceful Startup ────────────────────────────────
(async () => {
  try {
    await connectDB();
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 RecallAI server running on port ${PORT}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();

// ─── Graceful Shutdown ───────────────────────────────
const shutdown = (signal) => {
  logger.info(`\n${signal} received. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});
