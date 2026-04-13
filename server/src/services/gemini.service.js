const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const logger = require('../config/logger');
const { getDecryptedApiKey } = require('../utils/user.utils');

/**
 * Create a Gemini client using the user's decrypted API key.
 */
const createGeminiClient = (apiKey) => {
  return new GoogleGenerativeAI(apiKey);
};

/**
 * OpenRouter Failover Strategy
 */
const processWithOpenRouter = async (apiKey, content, contentType, url) => {
  try {
    logger.info(`[AI FAILOVER] Attempting content processing via OpenRouter...`);
    
    // Using a reliable model via OpenRouter (e.g., google/gemini-2.0-flash-exp:free or similar)
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'google/gemini-2.5-flash-latest', // Matching the requested 2.5 series
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent knowledge-management assistant. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: `Analyze the following ${contentType} content and return a JSON object with: 
          1. "title" (max 80 chars), 
          2. "summary" (2-4 paragraphs), 
          3. "keyPoints" (array of 3-7 strings), 
          4. "tags" (array of 3-8 lowercase strings).
          
          Content: ${content.substring(0, 15000)}`
        }
      ],
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://recall-ai-vault.com',
        'X-Title': 'Recall AI Vault'
      },
      timeout: 30000
    });

    const result = response.data.choices[0].message.content;
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;

    return {
      title: parsed.title || 'Untitled Record',
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (error) {
    logger.error(`[AI FAILOVER] OpenRouter failed: ${error.message}`);
    throw error;
  }
};

/**
 * Process content through Gemini with OpenRouter failover.
 */
const processContentWithAI = async (apiKey, content, contentType, url = '', userId = null) => {
  try {
    const genAI = createGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const linkInstructions = contentType === 'link'
      ? `\nSPECIAL INSTRUCTIONS FOR LINKS: 
1. If the content appears to be a login page, cookie consent wall, platform error, or generic "sign-in" interface, IGNORE that text entirely.
2. If the main content is blocked or missing, use the URL structure and platform name (${url}) to generate a helpful "Knowledge Bookmark" entry.
3. For social media (Instagram, TikTok, X), describe the likely content of the link based on the URL (e.g., "An Instagram Reel"), but do NOT summarize the login page boilerplate.\n`
      : '';

    const prompt = `You are an intelligent knowledge-management assistant. Analyze the following ${contentType} content and return a JSON object with these fields:
    
1. "title": A concise, descriptive title (max 80 chars). Never use words like "Error", "Unavailable", or "Inaccessible" in titles.
2. "summary": A comprehensive yet concise summary (2-4 paragraphs)
3. "keyPoints": An array of 3-7 key insights/takeaways as strings
4. "tags": An array of 3-8 relevant category tags (lowercase, single/double words)
${linkInstructions}
IMPORTANT: Return ONLY valid JSON, no markdown fences, no explanation.

Content to analyze:
---
${content.substring(0, 15000)}
---`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title || 'Untitled Record',
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (error) {
    logger.warn(`Gemini failed: ${error.message}. Checking for OpenRouter failover...`);
    
    // Failover to OpenRouter if userId and OpenRouter key are available
    if (userId) {
      try {
        const orKey = await getDecryptedApiKey(userId, 'openrouter').catch(() => null);
        if (orKey) {
          return await processWithOpenRouter(orKey, content, contentType, url);
        }
      } catch (orErr) {
        logger.error(`OpenRouter failover aborted: ${orErr.message}`);
      }
    }

    // FINAL FALLBACK: Knowledge Bookmark (Non-AI metadata extraction)
    logger.info(`[FINAL FALLBACK] Generating basic knowledge bookmark for ${url}`);
    return {
      title: `Bookmark: ${url.split('/').pop() || 'New Link'}`,
      summary: `This is a saved knowledge bookmark for ${url}. The content was preserved for your vault, and AI-powered insights can be regenerated once platform connectivity or API availability is restored.`,
      keyPoints: [`Source URL: ${url}`, 'Platform: Web Bookmark', 'Status: Content preserved'],
      tags: ['bookmark', 'saved-link', 'knowledge-vault']
    };
  }
};

/**
 * Generate a text embedding using Gemini's embedding model.
 */
const generateEmbedding = async (apiKey, text) => {
  try {
    const genAI = createGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const truncated = text.substring(0, 8000);
    const result = await model.embedContent(truncated);
    return result.embedding.values;
  } catch (error) {
    logger.error('Embedding generation failed:', error);
    return [];
  }
};

/**
 * Re-rank search results using Gemini for relevance scoring.
 */
const rerankResults = async (apiKey, query, results) => {
  try {
    if (!results.length) return [];
    const genAI = createGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const resultSummaries = results.map((r, i) => ({
      index: i,
      title: r.aiGeneratedTitle,
      summary: r.aiSummary?.substring(0, 300),
      tags: r.tags,
    }));
    const prompt = `Given the search query: "${query}"\nAnalyze these records and return a JSON array with "index", "relevanceScore", and "relevanceSummary".\nRecords: ${JSON.stringify(resultSummaries)}`;
    const result = await model.generateContent(prompt);
    const cleaned = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rankings = JSON.parse(cleaned);
    return rankings
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map((rank) => ({
        ...results[rank.index]?.toObject?.() || results[rank.index],
        relevanceScore: rank.relevanceScore,
        relevanceSummary: rank.relevanceSummary,
      }))
      .filter((r) => r.relevanceScore > 20);
  } catch (error) {
    return results;
  }
};

/**
 * Synthesize a comprehensive AI answer from search results.
 */
const synthesizeAnswer = async (apiKey, query, records) => {
  try {
    if (!records.length) return null;
    const genAI = createGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const context = records.map((r, i) => ({
      sourceIndex: i + 1,
      id: r._id?.toString(),
      title: r.aiGeneratedTitle,
      summary: r.aiSummary?.substring(0, 500),
      url: r.originalContent?.startsWith('http') ? r.originalContent : null,
    }));
    const prompt = `Synthesize an answer for "${query}" based on these sources: ${JSON.stringify(context)}. Return JSON with "answer", "keyInsights", "suggestedActions", "citedSources".`;
    const result = await model.generateContent(prompt);
    const cleaned = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    return null;
  }
};

module.exports = {
  processContentWithAI,
  generateEmbedding,
  rerankResults,
  synthesizeAnswer,
};
