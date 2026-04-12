const router = require('express').Router();
const {
  sendMessage,
  getNewMessages,
  acknowledgeMessages,
} = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/new', getNewMessages);
router.post('/send', sendMessage);
router.post('/ack', acknowledgeMessages);


// Helper for chat file uploads
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  // In a real app, we'd upload to S3/Cloudinary and return URL.
  // For this demo/local setup, we'll return a base64 or similar if small, 
  // or a mock URL. Since the user wants "local store or not include my DB", 
  // we'll simulate the file handling.
  
  // Let's assume for now we return the file details.
  res.status(200).json({
    success: true,
    data: {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      // We'll return a data URI for the buffer so it can be stored locally
      url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
    }
  });
});

module.exports = router;
