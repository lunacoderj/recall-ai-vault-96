const axios = require('axios');
const logger = require('../config/logger');
const { getDecryptedApiKey } = require('../utils/user.utils');

/**
 * Strategy: Internal Instagram extraction via Apify (Nuclear Option)
 */
const fetchInstagramViaApify = async (url, apifyKey) => {
  try {
    logger.info(`[SOCIAL] Running Apify Instagram Scraper for: ${url}`);
    
    // Using the "Sync" run for simplicity in this implementation
    // Endpoint for running the instagram-scraper actor
    const runUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyKey}`;
    
    const response = await axios.post(runUrl, {
      directUrls: [url],
      resultsLimit: 1,
      scrapeType: "posts"
    }, {
      timeout: 120000 // Apify can take a while
    });

    const items = response.data;
    if (items && items.length > 0) {
      const post = items[0];
      const content = [
        `[Instagram Post via Apify]`,
        `Caption: ${post.caption || 'No caption'}`,
        `Owner: ${post.ownerUsername || 'Unknown'}`,
        `Hashtags: ${(post.hashtags || []).join(', ')}`,
        `Type: ${post.type || 'Unknown'}`
      ].join('\n\n');
      
      return content;
    }
    return null;
  } catch (err) {
    logger.error(`[SOCIAL] Apify failed for ${url}: ${err.message}`);
    return null;
  }
};

/**
 * Strategy: Social extraction via Supadata
 */
const fetchSocialViaSupadata = async (url, supadataKey) => {
  try {
    const cleanUrl = new URL(url);
    cleanUrl.search = ""; 
    const sanitizedUrl = cleanUrl.origin + cleanUrl.pathname;

    logger.info(`[SOCIAL] Trying Supadata for: ${sanitizedUrl}`);
    
    let response;
    try {
      response = await axios.get('https://api.supadata.ai/v1/instagram/transcript', {
        params: { url: sanitizedUrl },
        headers: { 'x-api-key': supadataKey }
      });
    } catch (e1) {
      logger.warn(`[SOCIAL] Supadata /v1/instagram/transcript failed. Trying fallback endpoint...`);
      response = await axios.get('https://api.supadata.ai/v1/social/transcript', {
        params: { url: sanitizedUrl },
        headers: { 'x-api-key': supadataKey }
      });
    }
    
    if (response.data && (response.data.transcript || response.data.content)) {
      return response.data.transcript || response.data.content;
    }
    return null;
  } catch (err) {
    logger.error(`[SOCIAL] Supadata failed for ${url}: ${err.message}`);
    return null;
  }
};

/**
 * Main Entry Point: Extract transcript/content from social links
 */
const extractSocialTranscript = async (url, userId) => {
  const isInstagram = url.includes('instagram.com/reel') || url.includes('instagram.com/p/');
  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

  if (!isInstagram && !isYoutube) return null;

  // 1. Try Apify for Instagram if available
  if (isInstagram) {
    try {
      const apifyKey = await getDecryptedApiKey(userId, 'apify');
      const apifyData = await fetchInstagramViaApify(url, apifyKey);
      if (apifyData) return apifyData;
    } catch (err) {
      logger.info(`[SOCIAL] No Apify key or Apify failed, falling back to Supadata/Generic...`);
    }
  }

  // 2. Try Supadata (Generic Social/YT)
  try {
    const supadataKey = await getDecryptedApiKey(userId, 'supadata');
    const supadataData = await fetchSocialViaSupadata(url, supadataKey);
    if (supadataData) return supadataData;
  } catch (err) {
    logger.info(`[SOCIAL] Supadata extraction failed or key missing.`);
  }

  return null;
};

module.exports = {
  extractSocialTranscript,
};
