const axios = require('axios');
const logger = require('../config/logger');
const { getDecryptedApiKey } = require('../utils/user.utils');

/**
 * Strategy: Instagram via RapidAPI — tries multiple endpoints for resilience
 * Optimized for Carousel support and faster failovers.
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

  /**
   * Optimized Waterfall Strategy:
   * We use shorter timeouts (8s) per request. Total worst-case ~24s 
   * instead of 45s. If an API is truly down or rate-limited, we break early.
   */
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
        timeout: 8000, // Balanced timeout for resilience
      };

      if (endpoint.type === 'POST') config.data = endpoint.data;
      if (endpoint.type === 'GET') {
        const p = endpoint.getParams ? endpoint.getParams() : endpoint.params;
        if (!p) continue;
        config.params = p;
      }

      const res = await axios.request(config);
      const data = res?.data;

      if (data) {
        const result = parseInstagramResponse(data, cleanUrl);
        if (result) {
          logger.info(`[SOCIAL] Instagram ${endpoint.name} succeeded`);
          return result;
        }
      }
    } catch (e) {
      const status = e.response?.status;
      logger.warn(`[SOCIAL] Instagram ${endpoint.name} failed (${status || 'TIMEOUT'}): ${e.message}`);
      
      // Fast-Fail logic: If the key is blocked, invalid, or exhausted, don't keep trying and hanging the server
      if (status === 401 || status === 403 || status === 429) {
        logger.error(`[SOCIAL] RapidAPI key error/limit hit on ${endpoint.name}. Aborting chain.`);
        break; 
      }
    }
  }

  return null;
};

/**
 * Enhanced Parser with CAROUSEL support.
 * Extracts all media items from carousels instead of just the first one.
 */
const parseInstagramResponse = (data, url) => {
  if (!data || typeof data !== 'object') return null;

  // Normalize data shape (some APIs return an array, some a single object, some nest in .items or .data)
  const items = Array.isArray(data) ? data : (data.items || data.data || [data]);
  
  if (items.length === 0) return null;

  let mainCaption = '';
  let author = '';
  let likes = 0;
  const mediaUrls = new Set();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    // 1. Extract Global Metadata (usually found in the root item)
    if (!mainCaption) {
      mainCaption = 
        item.caption?.text || 
        item.caption || 
        item.text || 
        item.description || 
        item.edge_media_to_caption?.edges?.[0]?.node?.text || 
        item.caption_text ||
        '';
    }
    
    if (!author) {
      author = item.owner?.username || item.user?.username || item.username || item.node?.owner?.username || '';
    }
    
    if (!likes) {
      likes = item.like_count || item.edge_liked_by?.count || item.edge_media_preview_like?.count || 0;
    }

    // 2. Extract Media (Supporting Carousel/Sidecar)
    // Check for carousel children (Standard Instagram API shape)
    const children = item.edge_sidecar_to_children?.edges || item.carousel_media || [];
    
    if (children.length > 0) {
      children.forEach(child => {
        const node = child.node || child;
        const mUrl = node.video_url || node.display_url || node.image_versions2?.candidates?.[0]?.url || node.video_versions?.[0]?.url;
        if (mUrl) mediaUrls.add(mUrl);
      });
    } else {
      // Single Item extraction
      const mUrl = 
        item.video_url || 
        item.display_url || 
        item.thumbnail_url || 
        item.image_url ||
        item.node?.video_url || 
        item.node?.display_url ||
        (item.video_versions && item.video_versions[0]?.url) ||
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
 * Strategy: YouTube via Supadata (Parallel Transcript + Metadata Fetching)
 */
const fetchYoutubeViaSupadata = async (url, supadataKey) => {
  try {
    logger.info(`[SOCIAL] Fetching YouTube via Supadata: ${url}`);

    // Fetch meta and transcript in parallel to save time
    const [metaRes, transRes] = await Promise.allSettled([
      axios.get('https://api.supadata.ai/v1/youtube/video', {
        params: { url },
        headers: { 'x-api-key': supadataKey },
        timeout: 10000,
      }),
      axios.get('https://api.supadata.ai/v1/youtube/transcript', {
        params: { url, text: true },
        headers: { 'x-api-key': supadataKey },
        timeout: 15000,
      }),
    ]);

    const meta = metaRes.status === 'fulfilled' ? metaRes.value?.data : null;
    const transData = transRes.status === 'fulfilled' ? transRes.value?.data : null;

    let transcriptText = '';
    if (transData) {
      if (typeof transData === 'string') {
        transcriptText = transData;
      } else if (Array.isArray(transData?.content)) {
        transcriptText = transData.content.map(i => i?.text || '').filter(Boolean).join(' ');
      } else if (transData?.transcript) {
        transcriptText = typeof transData.transcript === 'string' 
          ? transData.transcript 
          : transData.transcript.map?.(i => i?.text || '').join(' ') || '';
      }
    }

    const parts = [
      `[Platform: YouTube]`,
      `Title: ${meta?.title || meta?.name || 'Unknown Title'}`,
      `Channel: ${meta?.channelTitle || meta?.author?.displayName || 'Unknown Channel'}`,
    ];
    if (meta?.description) parts.push(`Description: ${meta.description.substring(0, 500)}`);
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
    if (!data?.content) return null;
    return `[Web Content Scraped]\nSource: ${data.name || url}\n\n${data.content}`;
  } catch (err) {
    return null;
  }
};

/**
 * Main Orchestrator: Route and handle defensive failovers
 */
const extractSocialTranscript = async (url, userId) => {
  const sanitizedUrl = url.trim().replace(/[.,!?;:)]+$/, '');
  const cleanUrl = sanitizedUrl.toLowerCase();

  const isInstagram = cleanUrl.includes('instagram.com/');
  const isYoutube = cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');

  try {
    // 1. Instagram Logic
    if (isInstagram) {
      const rapidKey = await getDecryptedApiKey(userId, 'rapidapi').catch(() => null);
      if (rapidKey) {
        const result = await fetchInstagramViaRapidAPI(sanitizedUrl, rapidKey);
        if (result) return result;
      }
    }

    // 2. YouTube Logic
    if (isYoutube) {
      const supadataKey = await getDecryptedApiKey(userId, 'supadata').catch(() => null);
      if (supadataKey) {
        const result = await fetchYoutubeViaSupadata(sanitizedUrl, supadataKey);
        if (result) return result;
      }
    }

    // 3. Generic Fallback (all platforms)
    const sdk = await getDecryptedApiKey(userId, 'supadata').catch(() => null);
    if (sdk) {
      const generic = await fetchGenericViaSupadata(sanitizedUrl, sdk);
      if (generic) return generic;
    }
  } catch (error) {
    logger.warn(`[SOCIAL] Orchestration error for ${url}: ${error.message}`);
  }

  // Returning null allows the caller to trigger the Gemini/OpenRouter logic
  return null;
};

module.exports = { extractSocialTranscript };
