const axios = require('axios');
const logger = require('../config/logger');
const { getDecryptedApiKey } = require('../utils/user.utils');

/**
 * Defensive utility to safely navigate nested objects without throwing.
 * path: dot-notation string (e.g., 'data.items.0.caption.text')
 */
const safeGet = (obj, path, fallback = null) => {
  if (!obj || typeof obj !== 'object') return fallback;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return fallback;
    current = current[part];
  }
  return current === undefined || current === null ? fallback : current;
};

/**
 * Strategy: Instagram via RapidAPI — tries multiple endpoints for resilience
 */
const fetchInstagramViaRapidAPI = async (url, rapidKey) => {
  // 1. Sanitize and Normalize URL
  let cleanUrl = url.trim().replace(/[.,!?;:)]+$/, '');
  try {
    const u = new URL(cleanUrl);
    cleanUrl = `${u.origin}${u.pathname}`.replace(/\/$/, '');
  } catch (_) {}

  logger.info(`[SOCIAL] Fetching Instagram via RapidAPI: ${cleanUrl}`);

  const baseHeaders = {
    'x-rapidapi-key': rapidKey,
    'x-rapidapi-host': 'instagram120.p.rapidapi.com',
    'Content-Type': 'application/json',
  };

  const endpoints = [
    {
      name: 'instagram120/links',
      type: 'POST',
      url: 'https://instagram120.p.rapidapi.com/api/instagram/links',
      data: { url: cleanUrl }
    },
    {
      name: 'instagram120/reels',
      type: 'GET',
      url: 'https://instagram120.p.rapidapi.com/api/instagram/reels',
      getParams: () => {
        const match = cleanUrl.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
        return match ? { shortcode: match[2] } : null;
      }
    },
    {
      name: 'instagram-scraper-api2',
      type: 'GET',
      url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/post_info',
      params: { code_or_id_or_url: cleanUrl, include_insights: 'false' },
      host: 'instagram-scraper-api2.p.rapidapi.com'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.type,
        url: endpoint.url,
        headers: { 
          ...baseHeaders, 
          'x-rapidapi-host': endpoint.host || baseHeaders['x-rapidapi-host'] 
        },
        timeout: 12000, // STRICT TIMEOUT AS REQUESTED
      };

      if (endpoint.type === 'POST') config.data = endpoint.data;
      if (endpoint.type === 'GET') {
        const p = endpoint.getParams ? endpoint.getParams() : endpoint.params;
        if (!p) continue;
        config.params = p;
      }

      const res = await axios.request(config);
      const data = res?.data;

      // Extract caption directly using defensive paths if any
      const directCaption = safeGet(data, 'data.items.0.caption.text') || safeGet(data, 'items.0.caption.text');

      if (data) {
        const result = parseInstagramResponse(data, cleanUrl, directCaption);
        if (result) {
          logger.info(`[SOCIAL] Instagram ${endpoint.name} succeeded`);
          return result;
        }
      }
    } catch (e) {
      const status = e.response?.status;
      logger.warn(`[SOCIAL] Instagram ${endpoint.name} failed (${status || 'TIMEOUT'}): ${e.message}`);
      
      if (status === 401 || status === 403 || status === 429) {
        logger.error(`[SOCIAL] RapidAPI key error/limit hit on ${endpoint.name}. Aborting chain.`);
        break; 
      }
    }
  }

  return null;
};

/**
 * Enhanced Parser with CAROUSEL support and safeGet defensive logic
 */
const parseInstagramResponse = (data, url, fallbackCaption = null) => {
  if (!data || typeof data !== 'object') return null;

  // Normalize data shape defensively
  const items = Array.isArray(data) ? data : (data.items || data.data || [data]);
  
  if (items.length === 0) return null;

  let mainCaption = fallbackCaption || '';
  let author = '';
  let likes = 0;
  const mediaUrls = new Set();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    // 1. Extract Global Metadata defensively using safeGet
    if (!mainCaption) {
      mainCaption = 
        safeGet(item, 'caption.text') || 
        safeGet(item, 'caption') || 
        safeGet(item, 'text') || 
        safeGet(item, 'description') || 
        safeGet(item, 'edge_media_to_caption.edges.0.node.text') || 
        safeGet(item, 'caption_text') ||
        '';
    }
    
    if (!author) {
      author = safeGet(item, 'owner.username') || safeGet(item, 'user.username') || safeGet(item, 'username') || safeGet(item, 'node.owner.username') || '';
    }
    
    if (!likes) {
      likes = safeGet(item, 'like_count') || safeGet(item, 'edge_liked_by.count') || safeGet(item, 'edge_media_preview_like.count') || 0;
    }

    // 2. Extract Media (Supporting Carousel/Sidecar)
    const children = safeGet(item, 'edge_sidecar_to_children.edges') || safeGet(item, 'carousel_media') || [];
    
    if (children.length > 0) {
      children.forEach(child => {
        const node = child.node || child;
        const mUrl = safeGet(node, 'video_url') || safeGet(node, 'display_url') || safeGet(node, 'image_versions2.candidates.0.url') || safeGet(node, 'video_versions.0.url');
        if (mUrl) mediaUrls.add(mUrl);
      });
    } else {
      const mUrl = 
        safeGet(item, 'video_url') || 
        safeGet(item, 'display_url') || 
        safeGet(item, 'thumbnail_url') || 
        safeGet(item, 'image_url') ||
        safeGet(item, 'node.video_url') || 
        safeGet(item, 'node.display_url') ||
        safeGet(item, 'video_versions.0.url') ||
        '';
      if (mUrl) mediaUrls.add(mUrl);
    }
  }

  if (mainCaption || mediaUrls.size > 0) {
    return buildInstagramResult({ 
      caption: mainCaption, 
      mediaUrls: Array.from(mediaUrls), 
      author, 
      likes, 
      url 
    });
  }

  // Last resort: dump for AI
  const jsonStr = JSON.stringify(data).substring(0, 5000);
  if (jsonStr.length > 100) {
     return `[Platform: Instagram]\nURL: ${url}\n\n[Raw Metadata for AI Interpretation]:\n${jsonStr}`;
  }

  return null;
};

const buildInstagramResult = ({ caption, mediaUrls, author, likes, url }) => {
  const parts = [`[Platform: Instagram]`, `URL: ${url}`];
  if (author) parts.push(`Author: @${author}`);
  if (likes) parts.push(`Likes: ${likes}`);
  if (caption) parts.push(`\nCaption:\n${caption}`);
  
  if (mediaUrls && mediaUrls.length > 0) {
    if (mediaUrls.length > 1) {
      parts.push(`\nMedia Items (Carousel - ${mediaUrls.length} found):`);
      mediaUrls.forEach((m, i) => parts.push(`[${i + 1}] ${m}`));
    } else {
      parts.push(`\nMedia URL: ${mediaUrls[0]}`);
    }
  }
  return parts.join('\n');
};

/**
 * Strategy: YouTube via Supadata
 */
const fetchYoutubeViaSupadata = async (url, supadataKey) => {
  try {
    logger.info(`[SOCIAL] Fetching YouTube via Supadata: ${url}`);

    const [metaRes, transRes] = await Promise.allSettled([
      axios.get('https://api.supadata.ai/v1/youtube/video', {
        params: { url },
        headers: { 'x-api-key': supadataKey },
        timeout: 12000, // STRICT TIMEOUT
      }),
      axios.get('https://api.supadata.ai/v1/youtube/transcript', {
        params: { url, text: true },
        headers: { 'x-api-key': supadataKey },
        timeout: 12000, // STRICT TIMEOUT
      }),
    ]);

    const meta = metaRes.status === 'fulfilled' ? metaRes.value?.data : null;
    const transData = transRes.status === 'fulfilled' ? transRes.value?.data : null;

    let transcriptText = '';
    if (transData) {
      if (typeof transData === 'string') {
        transcriptText = transData;
      } else {
        transcriptText = safeGet(transData, 'transcript') || safeGet(transData, 'content') || '';
        if (Array.isArray(transcriptText)) {
          transcriptText = transcriptText.map(i => safeGet(i, 'text', '')).filter(Boolean).join(' ');
        }
      }
    }

    const parts = [
      `[Platform: YouTube]`,
      `Title: ${safeGet(meta, 'title') || safeGet(meta, 'name', 'Unknown Title')}`,
      `Channel: ${safeGet(meta, 'channelTitle') || safeGet(meta, 'author.displayName', 'Unknown Channel')}`,
    ];
    if (safeGet(meta, 'description')) parts.push(`Description: ${meta.description.substring(0, 500)}`);
    parts.push(`URL: ${url}`);

    if (transcriptText && transcriptText.length > 50) {
      parts.push(`\n--- Full Transcript ---`);
      parts.push(transcriptText.substring(0, 20000));
    } else {
      parts.push(`\n[Note: Video transcript was not available]`);
    }

    return parts.join('\n');
  } catch (err) {
    logger.error(`[SOCIAL] YouTube Supadata chain failed: ${err.message}`);
    return null;
  }
};

/**
 * Strategy: Supadata generic web scrape fallback
 */
const fetchGenericViaSupadata = async (url, supadataKey) => {
  try {
    const response = await axios.get('https://api.supadata.ai/v1/web/scrape', {
      params: { url },
      headers: { 'x-api-key': supadataKey },
      timeout: 12000,
    });
    const data = response?.data;
    const content = safeGet(data, 'content');
    if (!content) return null;
    return `[Web Content Scraped]\nSource: ${safeGet(data, 'name', url)}\n\n${content}`;
  } catch (err) {
    return null;
  }
};

/**
 * Main Orchestrator
 */
const extractSocialTranscript = async (url, userId) => {
  const sanitizedUrl = url.trim().replace(/[.,!?;:)]+$/, '');
  const cleanUrl = sanitizedUrl.toLowerCase();

  const isInstagram = cleanUrl.includes('instagram.com/');
  const isYoutube = cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');

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

    const sdk = await getDecryptedApiKey(userId, 'supadata').catch(() => null);
    if (sdk) {
      const generic = await fetchGenericViaSupadata(sanitizedUrl, sdk);
      if (generic) return generic;
    }
  } catch (error) {
    logger.warn(`[SOCIAL] Orchestration error for ${url}: ${error.message}`);
  }

  return null;
};

module.exports = { extractSocialTranscript };
