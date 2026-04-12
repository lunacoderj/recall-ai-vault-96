const router = require('express').Router();
const {
  sendMessage,
  getNewMessages,
  acknowledgeMessages,
  markSeen,
  getNewReceipts,
  acknowledgeReceipts,
  uploadChatFile
} = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

// ─── Messaging ──────────────────────────────────────
router.get('/new', getNewMessages);
router.post('/send', sendMessage);
router.post('/ack', acknowledgeMessages);

// ─── Read Receipts ──────────────────────────────────
router.post('/mark-seen', markSeen);
router.get('/receipts', getNewReceipts);
router.post('/receipts/ack', acknowledgeReceipts);

// ─── Media ───────────────────────────────────────────
router.post('/upload', upload.single('file'), uploadChatFile);

module.exports = router;
