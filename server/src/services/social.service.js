const axios = require('axios');
const logger = require('../config/logger');
const { getDecryptedApiKey } = require('../utils/user.utils');

/**
 * Strategy: User-provided RapidAPI (BYOK) - Using Instagram 120 API
 */
const fetchInstagramViaRapidAPI = async (url, rapidKey) => {
  try {
    logger.info(`[SOCIAL] Calling Instagram 120 RapidAPI for: ${url}`);
    
    const options = {
      method: 'POST',
      url: 'https://instagram120.p.rapidapi.com/api/instagram/links',
      headers: {
        'x-rapidapi-key': rapidKey,
        'x-rapidapi-host': 'instagram120.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      data: { url }
    };

    const response = await axios.request(options);
    const data = response.data;

    // 1. RAW DATA LOGGING (For Debugging Mapping Mismatches)
    console.log("----- [DEBUG] INSTAGRAM 120 RAW PAYLOAD -----");
    console.log(JSON.stringify(data, null, 2));
    console.log("---------------------------------------------");

    // 2. ROBUST EXTRACTION (Deep Optional Chaining & Multiple Paths)
    const caption = 
      data.caption || 
      data.description || 
      data.text || 
      data.edge_media_to_caption?.edges?.[0]?.node?.text || 
      data.items?.[0]?.caption?.text ||
      null;

    const mediaUrl = 
      data.media || 
      data.video_url || 
      data.display_url || 
      data.media_source || 
      data.items?.[0]?.video_versions?.[0]?.url ||
      data.items?.[0]?.image_versions2?.candidates?.[0]?.url ||
      null;

    // 3. PREVENT NULL SAVES (Stringified Dump Fallback)
    if (!caption && !mediaUrl) {
      logger.warn(`[SOCIAL] Data extraction failed for IG URL. Saving raw dump.`);
      return [
        `[Instagram Content - RAW EXTRACTION FALLBACK]`,
        `The automated parser could not map the fields. Raw data preserved below:`,
        `--- RAW DATA ---`,
        JSON.stringify(data, null, 2)
      ].join('\n\n');
    }

    return [
      `[Instagram Content via Personal RapidAPI (v120)]`,
      `Caption: ${caption || 'No caption extracted'}`,
      `Media URL: ${mediaUrl || 'No direct media URL found'}`,
      `Scraped via: Instagram 120 /links`
    ].join('\n\n');

  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error('RapidAPI Rate Limit Exceeded. Please check your Instagram 120 plan.');
    }
    if (err.response?.status === 403) {
      throw new Error('Invalid RapidAPI Key. Please re-configure in Settings.');
    }
    logger.error(`[SOCIAL] Instagram 120 RapidAPI failed: ${err.message}`);
    throw err;
  }
};

/**
 * Strategy: Social extraction via Supadata (Only for Youtube/Others)
 */
const fetchSocialViaSupadata = async (url, supadataKey) => {
  try {
    logger.info(`[SOCIAL] Trying Supadata for: ${url}`);
    const response = await axios.get('https://api.supadata.ai/v1/instagram/transcript', {
      params: { url },
      headers: { 'x-api-key': supadataKey }
    });
    return response.data.transcript || response.data.content || null;
  } catch (err) {
    return null;
  }
};

/**
 * Main Entry Point
 */
const extractSocialTranscript = async (url, userId, userRapidKey = null) => {
  const isInstagram = url.includes('instagram.com/reel') || url.includes('instagram.com/p/');
  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

  if (isInstagram) {
    try {
      const dbRapidKey = await getDecryptedApiKey(userId, 'rapidapi');
      const rapidData = await fetchInstagramViaRapidAPI(url, dbRapidKey);
      if (rapidData) return rapidData;
    } catch (err) {
      if (err.code === 'NO_API_KEY') {
        throw new Error('Instagram requires a configured RapidAPI key in Settings.');
      }
      if (err.message.includes('RapidAPI')) throw err;
      logger.error(`[SOCIAL] Instagram scraping failed: ${err.message}`);
      return null;
    }
    return null;
  }

  if (isYoutube) {
    try {
      const supadataKey = await getDecryptedApiKey(userId, 'supadata');
      const supadataData = await fetchSocialViaSupadata(url, supadataKey);
      if (supadataData) return supadataData;
    } catch (err) {}
    return null;
  }

  return null;
};

module.exports = {
  extractSocialTranscript,
};
