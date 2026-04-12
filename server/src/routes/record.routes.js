const router = require('express').Router();
const {
  addRecord,
  uploadRecord,
  getRecords,
  getRecord,
  deleteRecord,
} = require('../controllers/record.controller');
const { authenticate } = require('../middleware/auth');
const { addRecordValidator, recordIdValidator } = require('../middleware/validators');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/upload');

// All record routes require authentication
router.use(authenticate);

// POST /api/records/add
router.post('/add', addRecordValidator, validate, addRecord);

// POST /api/records/upload
router.post('/upload', upload.single('file'), uploadRecord);

// GET /api/records
router.get('/', getRecords);

// GET /api/records/:id
router.get('/:id', recordIdValidator, validate, getRecord);

// DELETE /api/records/:id
router.delete('/:id', recordIdValidator, validate, deleteRecord);

module.exports = router;
