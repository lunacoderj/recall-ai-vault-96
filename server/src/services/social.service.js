const axios = require('axios');
const logger = require('../config/logger');
const { getDecryptedApiKey } = require('../utils/user.utils');

/**
 * Strategy: Instagram 120 RapidAPI (/links endpoint)
 * This endpoint is the most reliable for shared URLs.
 */
const fetchInstagramViaRapidAPI = async (url, rapidKey) => {
  try {
    logger.info(`[SOCIAL] Fetching Instagram data via /links: ${url}`);
    
    const response = await axios.request({
      method: 'POST',
      url: 'https://instagram120.p.rapidapi.com/api/instagram/links',
      headers: {
        'x-rapidapi-key': rapidKey,
        'x-rapidapi-host': 'instagram120.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      data: { url },
      timeout: 15000
    });

    const data = response?.data;
    if (!data) return null;

    // RIGOROUS OPTIONAL CHAINING based on RapidAPI sample response structures
    const caption = 
      data?.caption || 
      data?.text || 
      data?.description ||
      data?.edge_media_to_caption?.edges?.[0]?.node?.text || 
      data?.items?.[0]?.caption?.text ||
      null;

    const mediaUrl = 
      data?.media || 
      data?.video_url || 
      data?.display_url || 
      data?.items?.[0]?.video_versions?.[0]?.url ||
      null;

    // If we have data but specific fields are missing, preserve the entire JSON object
    // for the AI to interpret from the raw text.
    if (!caption && !mediaUrl) {
      logger.warn(`[SOCIAL] Instagram parser matched no fields. Preserving raw payload.`);
      return `[Instagram Metadata Log]\n${JSON.stringify(data, null, 2)}`;
    }

    return [
      `[Platform: Instagram]`,
      `Caption: ${caption || 'N/A'}`,
      `Media Source: ${mediaUrl || 'N/A'}`,
      `Direct URL: ${url}`
    ].join('\n');

  } catch (err) {
    logger.error(`[SOCIAL] RapidAPI Instagram call failed: ${err.message}`);
    return null; // Graceful failover to Gemini
  }
};

/**
 * Strategy: Supadata YouTube Pipeline (Metadata + Transcript)
 */
const fetchYoutubeViaSupadata = async (url, supadataKey) => {
  try {
    logger.info(`[SOCIAL] Fetching YouTube data via Supadata: ${url}`);
    
    // 1. Fetch Metadata (Title, Author, Description)
    const metaResponse = await axios.get('https://api.supadata.ai/v1/metadata', {
      params: { url },
      headers: { 'x-api-key': supadataKey },
      timeout: 10000
    }).catch(() => null);

    // 2. Fetch Transcript
    const transcriptResponse = await axios.get('https://api.supadata.ai/v1/transcript', {
      params: { url },
      headers: { 'x-api-key': supadataKey },
      timeout: 15000
    }).catch(() => null);

    const meta = metaResponse?.data;
    const transData = transcriptResponse?.data;

    // SECURE TRANSCRIPT PARSING: Map and join text from the content array
    let transcriptText = 'No transcript available.';
    if (Array.isArray(transData?.content)) {
      transcriptText = transData.content
        .map(item => item?.text || '')
        .filter(t => t.length > 0)
        .join(' ');
    }

    // Assemble the full data packet for the AI
    const resultParts = [
      `[Platform: YouTube]`,
      `Title: ${meta?.title || 'Unknown Title'}`,
      `Channel: ${meta?.author?.displayName || meta?.author?.username || 'Unknown Author'}`,
      `Description: ${meta?.description || 'N/A'}`,
      `\n--- Full Transcript ---`,
      transcriptText
    ];

    return resultParts.join('\n');
  } catch (err) {
    logger.error(`[SOCIAL] Supadata YouTube processing crashed: ${err.message}`);
    return null;
  }
};

/**
 * Strategy: Supadata Generic Web Scraping (Fallback for other social links)
 */
const fetchGenericViaSupadata = async (url, supadataKey) => {
  try {
    const response = await axios.get('https://api.supadata.ai/v1/web/scrape', {
      params: { url },
      headers: { 'x-api-key': supadataKey },
      timeout: 15000
    });
    
    const data = response?.data;
    if (!data?.content) return null;

    return `[Web Content Scraped]\nSource: ${data.name || url}\n\n${data.content}`;
  } catch (err) {
    return null;
  }
};

/**
 * Orchestrator: Route by platform with defensive failovers
 */
const extractSocialTranscript = async (url, userId) => {
  // 1. Rigorous Sanitization (Trailing punctuation & share artifacts)
  const sanitizedUrl = url.trim().replace(/[.,!?;:)]+$/, "").split('?')[0] + (url.includes('?') ? '?' + url.split('?')[1] : '');
  // Simplified sanitization for the routing comparison
  const cleanUrl = sanitizedUrl.toLowerCase();

  const isInstagram = cleanUrl.includes('instagram.com/');
  const isYoutube = cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');

  // Try Platform Specific APIs
  try {
    if (isInstagram) {
      const rapidKey = await getDecryptedApiKey(userId, 'rapidapi').catch(() => null);
      if (rapidKey) {
        const result = await fetchInstagramViaRapidAPI(sanitizedUrl, rapidKey);
        if (result) return result;
      }
    }

    if (isYoutube) {
      const supadataKey = await getDecryptedApiKey(userId, 'supadata').catch(() => null);
      if (supadataKey) {
        const result = await fetchYoutubeViaSupadata(sanitizedUrl, supadataKey);
        if (result) return result;
      }
    }

    // Fallback: If not IG/YT but we have Supadata, try generic scrape
    const supadataKeyFallback = await getDecryptedApiKey(userId, 'supadata').catch(() => null);
    if (supadataKeyFallback) {
      const genericResult = await fetchGenericViaSupadata(sanitizedUrl, supadataKeyFallback);
      if (genericResult) return genericResult;
    }

  } catch (error) {
    logger.warn(`[SOCIAL] Extraction chain interrupted for ${url}: ${error.message}`);
  }

  // If we reach here, we return null to trigger the Gemini/OpenRouter fallback in the controller
  return null;
};

module.exports = {
  extractSocialTranscript,
};
