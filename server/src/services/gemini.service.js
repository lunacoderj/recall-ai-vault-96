const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../config/logger');

/**
 * Create a Gemini client using the user's decrypted API key.
 * @param {string} apiKey - Decrypted Gemini API key
 * @returns {GoogleGenerativeAI}
 */
const createGeminiClient = (apiKey) => {
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Process content through Gemini: generate title, summary, key points, and tags.
 * @param {string} apiKey - Decrypted API key
 * @param {string} content - Raw text content
 * @param {string} contentType - Type of content (note, link, pdf, video, document)
 * @returns {Promise<{ title, summary, keyPoints, tags }>}
 */
const processContentWithAI = async (apiKey, content, contentType, url = '') => {
  try {
    const genAI = createGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    // Clean the response (remove markdown code fences if present)
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
    logger.error('Gemini content processing failed:', error);
    throw new Error(`AI processing failed: ${error.message}`);
  }
};

/**
 * Generate a text embedding using Gemini's embedding model.
 * @param {string} apiKey - Decrypted API key
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
const generateEmbedding = async (apiKey, text) => {
  try {
    const genAI = createGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

    // Truncate to ~8000 chars for embedding model limits
    const truncated = text.substring(0, 8000);

    const result = await model.embedContent(truncated);
    return result.embedding.values;
  } catch (error) {
    logger.error('Embedding generation failed:', error);
    // Return empty array as fallback — won't break saving
    return [];
  }
};

/**
 * Re-rank search results using Gemini for relevance scoring.
 * @param {string} apiKey - Decrypted API key
 * @param {string} query - Original search query
 * @param {Array} results - Array of record objects to re-rank
 * @returns {Promise<Array>} Re-ranked results with relevance info
 */
const rerankResults = async (apiKey, query, results) => {
  try {
    if (!results.length) return [];

    const genAI = createGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const resultSummaries = results.map((r, i) => ({
      index: i,
      title: r.aiGeneratedTitle,
      summary: r.aiSummary?.substring(0, 300),
      tags: r.tags,
    }));

    const prompt = `Given the search query: "${query}"

Analyze these knowledge records and return a JSON array ranking them by relevance. For each result, include:
- "index": the original index number
- "relevanceScore": a score from 0-100
- "relevanceSummary": a brief explanation of why this result is relevant to the query (1-2 sentences)

Records:
${JSON.stringify(resultSummaries, null, 2)}

Return ONLY valid JSON array, no markdown fences or explanation.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const rankings = JSON.parse(cleaned);

    // Merge ranking info back into results
    const rankedResults = rankings
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map((rank) => ({
        ...results[rank.index]?.toObject?.() || results[rank.index],
        relevanceScore: rank.relevanceScore,
        relevanceSummary: rank.relevanceSummary,
      }))
      .filter((r) => r.relevanceScore > 20); // filter out low relevance

    return rankedResults;
  } catch (error) {
    logger.error('Re-ranking failed, returning original order:', error);
    return results; // fallback: return original order
  }
};

/**
 * Synthesize a comprehensive AI answer from search results.
 * @param {string} apiKey - Decrypted API key
 * @param {string} query - The user's search query
 * @param {Array} records - Matched records from the search
 * @returns {Promise<object|null>}
 */
const synthesizeAnswer = async (apiKey, query, records) => {
  try {
    if (!records.length) return null;

    const genAI = createGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const context = records.map((r, i) => ({
      sourceIndex: i + 1,
      id: r._id?.toString(),
      title: r.aiGeneratedTitle,
      type: r.contentType,
      summary: r.aiSummary?.substring(0, 500),
      keyPoints: r.keyPoints?.slice(0, 5),
      tags: r.tags,
      url: r.originalContent?.startsWith('http') ? r.originalContent : null,
    }));

    const prompt = `You are an intelligent knowledge assistant. The user is searching their personal knowledge vault.

Search query: "${query}"

Here are the relevant records from their vault:
${JSON.stringify(context, null, 2)}

Based on these stored records, generate a comprehensive response as a JSON object with these fields:

1. "answer": A detailed, well-structured answer (3-5 paragraphs) that synthesizes information from the stored records. Reference source records naturally using [Source X] markers. Include relevant details, insights, and connections between sources. Make it informative and useful.
2. "keyInsights": An array of 3-6 key insights/takeaways distilled from all matching records
3. "suggestedActions": An array of 2-4 suggested next steps or related topics the user might want to explore
4. "citedSources": An array of objects with: sourceIndex (number), id (the record id string), title (record title), relevance (brief explanation of how this source contributed)

Rules:
- Write the answer as if you are a knowledgeable assistant summarizing what the user has saved
- Reference specific records using [Source 1], [Source 2] etc.
- If records contain links/URLs, mention them as useful resources
- Make the answer comprehensive — not just listing records but synthesizing knowledge
- Return ONLY valid JSON, no markdown fences or explanation.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    logger.error('Answer synthesis failed:', error);
    return null;
  }
};

module.exports = {
  processContentWithAI,
  generateEmbedding,
  rerankResults,
  synthesizeAnswer,
};
