const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const logger = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ─── Route Imports ───────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const recordRoutes = require('./routes/record.routes');
const searchRoutes = require('./routes/search.routes');
const friendsRoutes = require('./routes/friends.routes');
const messageRoutes = require('./routes/message.routes');

const app = express();

// ─── Security Middleware ─────────────────────────────
app.use(helmet());
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Filter XSS

// Production ready CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://recallaivault.jaggu.me',
  'https://recall-ai-vault-96.vercel.app',
  'http://localhost:5173',
  'http://localhost:8080',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by Security Policy (CORS)'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Rapidapi-Key'],
}));

// ─── Rate Limiting ───────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Security Alert: Rapid requests detected. Cooling down...',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
app.use('/api/', limiter);

// ─── Body Parsing ────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Body limit to prevent DOS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── HTTP Logging (Morgan → Winston) ────────────────
const morganStream = {
  write: (message) => logger.http(message.trim()),
};
app.use(morgan('combined', { stream: morganStream }));

// ─── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'RecallAI API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ──────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messageRoutes);

// ─── Error Handling ──────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
