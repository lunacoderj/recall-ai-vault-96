const User = require('../models/User');
const Record = require('../models/Record');
const { decrypt } = require('../utils/encryption');
const {
  generateEmbedding,
  rerankResults,
  synthesizeAnswer,
} = require('../services/gemini.service');
const logger = require('../config/logger');

const { getDecryptedApiKey } = require('../utils/user.utils');

/**
 * Compute cosine similarity between two vectors.
 */
const cosineSimilarity = (a, b) => {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
};

// ════════════════════════════════════════════════════
// POST /api/search
// ════════════════════════════════════════════════════
const search = async (req, res, next) => {
  try {
    const { query } = req.body;
    const userId = req.userId;

    // Get user's API key
    const apiKey = await getDecryptedApiKey(userId, 'gemini');

    let results = [];
    let searchMethod = 'vector';

    try {
      // ─── Vector Search ──────────────────────────────
      const queryEmbedding = await generateEmbedding(apiKey, query);

      if (queryEmbedding.length > 0) {
        // Fetch all user records with embeddings
        const allRecords = await Record.find({ userId })
          .select('+embedding')
          .lean();

        // Calculate similarity scores
        const scored = allRecords
          .filter((r) => r.embedding?.length > 0)
          .map((r) => ({
            ...r,
            similarity: cosineSimilarity(queryEmbedding, r.embedding),
          }))
          .filter((r) => r.similarity > 0.3) // threshold
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 20);

        // Remove embedding from response
        results = scored.map(({ embedding, ...rest }) => rest);
      }
    } catch (vectorError) {
      logger.warn('Vector search failed, falling back to keyword search:', vectorError.message);
      searchMethod = 'keyword';
    }

    // ─── Fallback: Keyword Search ─────────────────────
    if (results.length === 0) {
      searchMethod = 'keyword';
      results = await Record.find({
        userId,
        $text: { $search: query },
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(20)
        .lean();
    }

    // ─── Re-rank with AI ──────────────────────────────
    let rankedResults = results;
    if (results.length > 0) {
      try {
        rankedResults = await rerankResults(apiKey, query, results);
      } catch (rerankError) {
        logger.warn('Re-ranking failed, using raw results:', rerankError.message);
      }
    }

    // ─── Synthesize AI Answer ─────────────────────────
    let aiAnswer = null;
    if (rankedResults.length > 0) {
      try {
        aiAnswer = await synthesizeAnswer(apiKey, query, rankedResults);
      } catch (synthesisError) {
        logger.warn('Answer synthesis failed:', synthesisError.message);
      }
    }

    logger.info(
      `Search: "${query}" by user ${userId} → ${rankedResults.length} results (${searchMethod})${aiAnswer ? ' + AI answer' : ''}`
    );

    res.status(200).json({
      success: true,
      data: {
        query,
        searchMethod,
        totalResults: rankedResults.length,
        // AI-synthesized answer
        aiAnswer: aiAnswer
          ? {
              answer: aiAnswer.answer || '',
              keyInsights: aiAnswer.keyInsights || [],
              suggestedActions: aiAnswer.suggestedActions || [],
              citedSources: (aiAnswer.citedSources || []).map((src) => ({
                ...src,
                // Ensure IDs are present for frontend linking
                id: src.id || rankedResults[src.sourceIndex - 1]?._id?.toString(),
              })),
            }
          : null,
        // Source records
        results: rankedResults.map((r) => ({
          _id: r._id,
          aiGeneratedTitle: r.aiGeneratedTitle,
          aiSummary: r.aiSummary,
          keyPoints: r.keyPoints,
          tags: r.tags,
          contentType: r.contentType,
          originalContent: r.originalContent,
          createdAt: r.createdAt,
          relevanceScore: r.relevanceScore || null,
          relevanceSummary: r.relevanceSummary || null,
          similarity: r.similarity || null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { search };
