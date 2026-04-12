const router = require('express').Router();
const { search } = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth');
const { searchValidator } = require('../middleware/validators');
const { validate } = require('../middleware/validate');

// All search routes require authentication
router.use(authenticate);

// POST /api/search
router.post('/', searchValidator, validate, search);

module.exports = router;
