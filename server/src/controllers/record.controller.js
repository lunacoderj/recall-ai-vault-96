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

    // 1. INPUT SANITIZATION (Defensive check for sharing intent artifacts)
    let textToProcess = (rawContent || fileText || url || '').trim();
    let originalContent = textToProcess;

    if (!textToProcess) {
      return res.status(400).json({
        success: false,
        message: 'No content provided.',
        code: 'NO_CONTENT',
      });
    }

    // 2. URL EXTRACTION & CLEANING
    const extractedUrl = isUrl(textToProcess) ? textToProcess.replace(/[.,!?;:)]+$/, "") : null;

    if (extractedUrl) {
      originalContent = extractedUrl;
      
      // 3. SPECIALIZED SOCIAL ROUTING
      logger.info(`Processing URL for ${userId}: ${extractedUrl}`);
      try {
        const socialContent = await extractSocialTranscript(extractedUrl, userId);
        if (socialContent) {
          textToProcess = socialContent;
        } else {
          // Fallback to generic scraper if specialized API fails
          logger.info(`No social extraction available. Falling back to generic scraper...`);
          textToProcess = await extractUrlContent(extractedUrl);
        }
      } catch (routingError) {
        logger.warn(`Routing error: ${routingError.message}. Falling back to generic.`);
        textToProcess = await extractUrlContent(extractedUrl);
      }
    }

    // 4. AI PROCESSING & FAILOVER PIPELINE
    // Decrypt primary API key
    const apiKey = await getDecryptedApiKey(userId).catch(() => null);

    // Run AI processing with automatic failover (Gemini -> OpenRouter -> Bookmark)
    const [aiResult, embedding] = await Promise.all([
      processContentWithAI(apiKey, textToProcess, contentType || 'link', originalContent, userId),
      generateEmbedding(apiKey, textToProcess).catch(() => []),
    ]);

    // 5. DATA PERISTENCE
    const record = await Record.create({
      userId,
      originalContent,
      contentType: contentType || 'link',
      aiGeneratedTitle: aiResult?.title || 'Untitled Record',
      aiSummary: aiResult?.summary || 'Summary unavailable',
      keyPoints: aiResult?.keyPoints || [],
      tags: aiResult?.tags || [],
      rawText: textToProcess.substring(0, 50000),
      embedding,
    });

    logger.info(`Record created successfully: ${record._id}`);

    res.status(201).json({
      success: true,
      message: 'Record created successfully.',
      data: { record },
    });
  } catch (error) {
    logger.error(`Critical failure in addRecord: ${error.message}`);
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
