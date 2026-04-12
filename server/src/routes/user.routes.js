const router = require('express').Router();
const {
  saveApiKey,
  getProfile,
  updateProfile,
  savePublicKey,
} = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { apiKeyValidator, updateProfileValidator } = require('../middleware/validators');
const { validate } = require('../middleware/validate');

// All user routes require authentication
router.use(authenticate);

// POST /api/user/api-key
router.post('/api-key', apiKeyValidator, validate, saveApiKey);

// POST /api/user/public-key
router.post('/public-key', savePublicKey);

// GET /api/user/profile
router.get('/profile', getProfile);

// PUT /api/user/profile
router.put('/profile', updateProfileValidator, validate, updateProfile);

module.exports = router;
