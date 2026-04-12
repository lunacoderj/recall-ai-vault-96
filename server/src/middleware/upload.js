const multer = require('multer');
const path = require('path');

// ─── Allowed File Types ──────────────────────────────
const ALLOWED_MIMES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const ALLOWED_EXTS = ['.pdf', '.txt', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

// ─── File Filter ─────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error(
      `Unsupported file type: "${ext}". Allowed: PDF, TXT, DOCX`
    );
    err.status = 415;
    cb(err, false);
  }
};

// ─── Multer Instance (memory storage for processing) ─
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
});

module.exports = upload;
