const router = require('express').Router();
const { firebaseAuth, refreshToken, logout } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

// POST /api/auth/firebase  ← handles Google, email/password, any Firebase provider
router.post(
  '/firebase',
  body('idToken').notEmpty().withMessage('Firebase ID token is required'),
  validate,
  firebaseAuth
);

// POST /api/auth/refresh-token
router.post(
  '/refresh-token',
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  validate,
  refreshToken
);

// POST /api/auth/logout  (protected)
router.post('/logout', authenticate, logout);

module.exports = router;
