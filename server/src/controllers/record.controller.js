const User = require('../models/User');
const Record = require('../models/Record');
const { decrypt } = require('../utils/encryption');
const { extractTextFromFile } = require('../utils/fileParser');
const { extractUrlContent, isUrl } = require('../utils/urlExtractor');
const {
  processContentWithAI,
  generateEmbedding,
} = require('../services/gemini.service');
const { extractSocialTranscript } = require('../services/social.service');
const logger = require('../config/logger');

/**
 * Helper: Get decrypted API key for the current user.
 */
const { getDecryptedApiKey } = require('../utils/user.utils');

// ════════════════════════════════════════════════════
// POST /api/records/add
// ════════════════════════════════════════════════════
const addRecord = async (req, res, next) => {
  try {
    const { contentType, rawContent, url, fileText } = req.body;
    const userId = req.userId;

    // Determine the text content to process
    let textToProcess = rawContent || fileText || url || '';
    let originalContent = rawContent || url || fileText || '';

    if (!textToProcess) {
      return res.status(400).json({
        success: false,
        message: 'No content provided. Send rawContent, url, or fileText.',
        code: 'NO_CONTENT',
      });
    }

    const cleanedInput = textToProcess.trim();
    const extractedUrl = isUrl(cleanedInput) ? cleanedInput : null;

    if (extractedUrl) {
      originalContent = extractedUrl;
      
      // ─── Extract content from specialized links (IG/YT/Social) ──────
      const isInstagram = extractedUrl.includes('instagram.com/reel') || extractedUrl.includes('instagram.com/p/');
      const isYoutube = extractedUrl.includes('youtube.com') || extractedUrl.includes('youtu.be');

      if (isInstagram || isYoutube) {
      logger.info(`Social link detected for ${userId}. Routing to specialized API...`);
      
      const socialContent = await extractSocialTranscript(extractedUrl, userId);
      
      if (socialContent) {
        textToProcess = socialContent;
      } else {
        // Fallback: If scraper fails, use the URL itself as the content.
        // AI can still try to generate metadata from the URL string.
        logger.warn(`Social extraction failed for ${extractedUrl}. Falling back to URL as content.`);
        textToProcess = extractedUrl;
      }

    } else if (contentType === 'link' || isUrl(textToProcess.trim())) {
      // ─── Fallback for Normal Websites / PDFs ──────
      logger.info(`Standard web link detected. Routing to generic scraper...`);
      textToProcess = await extractUrlContent(extractedUrl);
    }
    } // <--- Added this missing brace to close if (extractedUrl)

    // Decrypt user's API key
    const apiKey = await getDecryptedApiKey(userId);

    // Process with AI (parallel)
    const [aiResult, embedding] = await Promise.all([
      processContentWithAI(apiKey, textToProcess, contentType, originalContent),
      generateEmbedding(apiKey, textToProcess),
    ]);

    // Save record
    const record = await Record.create({
      userId,
      originalContent,
      contentType,
      aiGeneratedTitle: aiResult.title,
      aiSummary: aiResult.summary,
      keyPoints: aiResult.keyPoints,
      tags: aiResult.tags,
      rawText: textToProcess.substring(0, 50000), // cap raw text storage
      embedding,
    });

    logger.info(`Record created: ${record._id} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Record created successfully.',
      data: { record },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// POST /api/records/upload
// ════════════════════════════════════════════════════
const uploadRecord = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
        code: 'NO_FILE',
      });
    }

    const { contentType } = req.body;
    const userId = req.userId;
    const { buffer, mimetype, originalname } = req.file;

    // Extract text from file
    const extractedText = await extractTextFromFile(buffer, mimetype, originalname);

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from the uploaded file.',
        code: 'EXTRACTION_FAILED',
      });
    }

    // Decrypt user's API key
    const apiKey = await getDecryptedApiKey(userId);

    // Determine content type
    const resolvedContentType = contentType || (mimetype === 'application/pdf' ? 'pdf' : 'document');

    // Process with AI (parallel)
    const [aiResult, embedding] = await Promise.all([
      processContentWithAI(apiKey, extractedText, resolvedContentType),
      generateEmbedding(apiKey, extractedText),
    ]);

    // Save record
    const record = await Record.create({
      userId,
      originalContent: originalname,
      contentType: resolvedContentType,
      aiGeneratedTitle: aiResult.title,
      aiSummary: aiResult.summary,
      keyPoints: aiResult.keyPoints,
      tags: aiResult.tags,
      rawText: extractedText.substring(0, 50000),
      embedding,
    });

    logger.info(`File record created: ${record._id} from ${originalname}`);

    res.status(201).json({
      success: true,
      message: 'File processed and record created successfully.',
      data: { record },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// GET /api/records
// ════════════════════════════════════════════════════
const getRecords = async (req, res, next) => {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Record.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Record.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// GET /api/records/:id
// ════════════════════════════════════════════════════
const getRecord = async (req, res, next) => {
  try {
    const record = await Record.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
        code: 'RECORD_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: { record },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// DELETE /api/records/:id
// ════════════════════════════════════════════════════
const deleteRecord = async (req, res, next) => {
  try {
    const record = await Record.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
        code: 'RECORD_NOT_FOUND',
      });
    }

    logger.info(`Record deleted: ${req.params.id} by user ${req.userId}`);

    res.status(200).json({
      success: true,
      message: 'Record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addRecord,
  uploadRecord,
  getRecords,
  getRecord,
  deleteRecord,
};
