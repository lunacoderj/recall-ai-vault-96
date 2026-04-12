const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../config/logger');

/**
 * Extract text from an uploaded file buffer based on MIME type.
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} mimetype - MIME type of the file
 * @param {string} filename - Original filename
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromFile = async (buffer, mimetype, filename) => {
  try {
    // ─── PDF ──────────────────────────────────────────
    if (mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text || '';
    }

    // ─── Plain Text ───────────────────────────────────
    if (mimetype === 'text/plain') {
      return buffer.toString('utf-8');
    }

    // ─── DOCX ─────────────────────────────────────────
    if (
      mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }

    // ─── Images ──────────────────────────────────────
    if (mimetype.startsWith('image/')) {
      return `Image File: ${filename} (Text extraction not supported)`;
    }

    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    logger.error(`Text extraction failed for ${filename}:`, error);
    throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
  }
};

module.exports = { extractTextFromFile };
