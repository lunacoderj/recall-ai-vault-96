const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../config/logger');

// ═══════════════════════════════════════════════════════════
// PLATFORM DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect the platform type from a URL for strategy routing.
 */
const detectPlatform = (url) => {
  const hostname = new URL(url).hostname.replace('www.', '');
  const path = new URL(url).pathname;

  if (hostname.includes('youtube.com') || hostname === 'youtu.be') return 'youtube';
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('tiktok.com')) return 'tiktok';
  if (hostname.includes('twitter.com') || hostname === 'x.com') return 'twitter';
  if (hostname.includes('reddit.com')) return 'reddit';
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('medium.com') || hostname.includes('substack.com')) return 'article';
  return 'generic';
};

/**
 * Extract YouTube video ID from various URL formats.
 */
const extractYouTubeVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
};

// ═══════════════════════════════════════════════════════════
// STRATEGY 1: YouTube Transcript + Metadata
// ═══════════════════════════════════════════════════════════

/**
 * Fetch YouTube transcript (auto-generated or manual captions).
 * Uses the youtube-transcript package which calls YouTube's internal
 * subtitle endpoint — no API key needed.
 */
const tryYouTubeTranscript = async (url) => {
  try {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;

    let transcript = [];
    try {
      const { YoutubeTranscript } = await import('youtube-transcript');
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      logger.warn(`Could not fetch transcript for ${videoId}: ${err.message}`);
    }

    const fullText = (transcript && transcript.length > 0) ? transcript.map((t) => t.text).join(' ') : null;

    // Also fetch video metadata via oEmbed (free, no key)
    let title = '';
    let author = '';
    try {
      const { data } = await axios.get('https://www.youtube.com/oembed', {
        params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
        timeout: 5000,
      });
      title = data.title || '';
      author = data.author_name || '';
    } catch { /* metadata is optional */ }

    const parts = [];
    parts.push(`Platform: YouTube`);
    if (title) parts.push(`Title: ${title}`);
    if (author) parts.push(`Channel: ${author}`);
    parts.push(`URL: ${url}`);
    parts.push(`Video ID: ${videoId}`);
    
    if (fullText) {
      parts.push(`\nFull Transcript (${transcript.length} segments):`);
      parts.push(fullText.substring(0, 20000));
    } else {
      parts.push(`\n[Note: Video transcript was not available, but metadata was successfully captured.]`);
    }

    const result = parts.join('\n');
    logger.info(`YouTube extraction: ${url} → ${result.length} chars`);
    return result;
  } catch (error) {
    logger.warn(`YouTube transcript failed for ${url}: ${error.message}`);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// STRATEGY 2: Jina Reader (JS-rendered clean text)
// ═══════════════════════════════════════════════════════════

/**
 * Jina Reader renders JavaScript-heavy pages and returns clean
 * markdown/text. Works well for articles, blogs, some social media.
 */
const tryJinaReader = async (url) => {
  try {
    const { data } = await axios.get(`https://r.jina.ai/${url}`, {
      timeout: 25000,
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
      },
    });

    const text = typeof data === 'string' ? data.trim() : '';

    // Check if Jina returned meaningful content (not login pages or errors)
    if (text.length > 100) {
      const lower = text.toLowerCase();
      const isLoginPage = 
        lower.includes('log in') && (lower.includes('instagram') || lower.includes('facebook') || lower.includes('password'));
      const isPolicyPage = lower.includes('privacy policy') && lower.includes('cookie') && text.length > 500 && text.length < 5000;

      if (isLoginPage || isPolicyPage) {
        logger.warn(`Jina returned login/policy page for ${url}`);
        return null;
      }

      return text.substring(0, 20000);
    }
    return null;
  } catch (error) {
    logger.warn(`Jina Reader failed for ${url}: ${error.message}`);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// STRATEGY 3: oEmbed Metadata (YouTube, TikTok, Twitter, etc.)
// ═══════════════════════════════════════════════════════════

const OEMBED_PROVIDERS = {
  'youtube.com': 'https://www.youtube.com/oembed',
  'youtu.be': 'https://www.youtube.com/oembed',
  'twitter.com': 'https://publish.twitter.com/oembed',
  'x.com': 'https://publish.twitter.com/oembed',
  'vimeo.com': 'https://vimeo.com/api/oembed.json',
  'tiktok.com': 'https://www.tiktok.com/oembed',
  'reddit.com': 'https://www.reddit.com/oembed',
};

const tryOEmbed = async (url) => {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const endpoint = OEMBED_PROVIDERS[hostname];
    if (!endpoint) return null;

    const { data } = await axios.get(endpoint, {
      params: { url, format: 'json' },
      timeout: 8000,
    });

    const parts = [];
    if (data.title) parts.push(`Title: ${data.title}`);
    if (data.author_name) parts.push(`Author: ${data.author_name}`);
    if (data.provider_name) parts.push(`Platform: ${data.provider_name}`);
    parts.push(`URL: ${url}`);
    if (data.html) {
      const $ = cheerio.load(data.html);
      const text = $.text().trim();
      if (text.length > 20) parts.push(`\nContent:\n${text}`);
    }

    return parts.length > 2 ? parts.join('\n') : null;
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// STRATEGY 4: Instagram-specific extraction
// ═══════════════════════════════════════════════════════════

/**
 * For Instagram URLs, try to extract via:
 * 1. Jina Reader (sometimes works)
 * 2. Instagram oEmbed (may provide caption)
 * 3. Embed page scraping for caption text
 */
const tryInstagram = async (url) => {
  try {
    // Extract shortcode from Instagram URL
    const match = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    const [, type, shortcode] = match;

    const parts = [];
    parts.push(`Platform: Instagram`);
    parts.push(`Content Type: ${type === 'reel' || type === 'reels' ? 'Reel' : 'Post'}`);
    parts.push(`URL: ${url}`);

    // Try Instagram's embed endpoint for caption data
    try {
      const embedUrl = `https://www.instagram.com/${type}/${shortcode}/embed/captioned/`;
      const { data: html } = await axios.get(embedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'text/html',
        },
      });

      const $ = cheerio.load(html);

      // Extract caption from the embed page
      const caption = $('.Caption, .EmbeddedMediaCaption').first().text().trim() ||
                      $('[class*="caption"]').first().text().trim() || '';

      const isBotCheck = html.toLowerCase().includes('login') && html.toLowerCase().includes('instagram');

      if (caption && caption.length > 10 && !isBotCheck) {
        parts.push(`\nCaption:\n${caption.substring(0, 5000)}`);
      } else if (isBotCheck) {
        logger.warn(`Instagram embed hit login wall for ${shortcode}`);
      }
    } catch { /* embed extraction is best effort */ }

    // Fallback 1: DDInstagram (Great for getting captions in oEmbed)
    if (parts.length <= 3) {
      try {
        const ddUrl = `https://www.ddinstagram.com/${type}/${shortcode}`;
        const { data: html } = await axios.get(ddUrl, { 
          timeout: 8000,
          headers: { 'User-Agent': 'Discordbot/2.0' } // Pretend to be discord to get meta tags
        });
        const $ = cheerio.load(html);
        const description = $('meta[property="og:description"]').attr('content') || 
                           $('meta[name="description"]').attr('content');
                           
        if (description && description.length > 10 && !description.includes('Instagram')) {
          parts.push(`\nDescription (via DDInsta):\n${description}`);
        }
      } catch (err) {
        logger.warn(`DDInstagram fallback failed: ${err.message}`);
      }
    }

    // Fallback 2: Jina Reader (standard fallback)
    if (parts.length <= 3) {
      const jinaContent = await tryJinaReader(url);
      if (jinaContent && jinaContent.length > 200) {
        parts.push(`\nExtracted Content:\n${jinaContent.substring(0, 10000)}`);
      }
    }

    // Only return if we got something beyond the base metadata
    return parts.join('\n').length > 100 ? parts.join('\n') : null;
  } catch (error) {
    logger.warn(`Instagram extraction failed for ${url}: ${error.message}`);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// STRATEGY 5: Standard HTML Scraping
// ═══════════════════════════════════════════════════════════

const tryHtmlScrape = async (url) => {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim() || '';

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') || '';

    const siteName = $('meta[property="og:site_name"]').attr('content') || '';

    // Remove non-content elements
    $('script, style, noscript, iframe, nav, footer, header, aside, .sidebar, .ad, .comments').remove();

    let bodyText = '';
    for (const sel of ['article', '[role="main"]', '.post-content', '.article-content', '.entry-content', 'main']) {
      const el = $(sel);
      if (el.length && el.text().trim().length > 100) {
        bodyText = el.text().trim();
        break;
      }
    }
    if (!bodyText || bodyText.length < 100) {
      bodyText = $('p').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 20).join('\n\n');
    }

    bodyText = bodyText.replace(/\s+/g, ' ').trim();

    const parts = [];
    if (title) parts.push(`Title: ${title}`);
    if (siteName) parts.push(`Source: ${siteName}`);
    parts.push(`URL: ${url}`);
    if (description) parts.push(`\nDescription: ${description}`);
    if (bodyText) parts.push(`\nContent:\n${bodyText.substring(0, 15000)}`);

    const finalContent = parts.join('\n');
    return finalContent.length > 200 ? finalContent : null;
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR — Smart extraction chain
// ═══════════════════════════════════════════════════════════

/**
 * Main URL content extractor — routes to the best strategy based on platform.
 */
const extractUrlContent = async (url) => {
  // 1. Sanitize URL: Strip trailing punctuation
  let sanitizedUrl = url.trim().replace(/[.,!?;:)]+$/, '');

  // 2. Normalize and strip tracking parameters using URL constructor
  try {
    const urlObj = new URL(sanitizedUrl);
    const trackingParams = ['igsh', 'utm_source', 'utm_medium', 'utm_campaign', 'si', 'feature', 'share_id'];
    trackingParams.forEach(p => urlObj.searchParams.delete(p));
    
    // Remove trailing slash from pathname if not root
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    sanitizedUrl = urlObj.toString();
  } catch (err) {
    logger.warn(`Failed to parse/normalize URL: ${url}. Proceeding with trimmed version.`);
  }

  const platform = detectPlatform(sanitizedUrl);
  logger.info(`Extracting URL [${platform}]: ${sanitizedUrl}`);

  // 1. YouTube specialized path
  if (platform === 'youtube') {
    const transcript = await tryYouTubeTranscript(sanitizedUrl);
    if (transcript) return transcript;
    
    // If transcript fails, fall back to deep scraping
    const jina = await tryJinaReader(sanitizedUrl);
    if (jina) return `Source: YouTube (Transcript Unavailable)\n\n${jina}`;
  }

  // 2. Instagram specialized path
  if (platform === 'instagram') {
    const insta = await tryInstagram(sanitizedUrl);
    if (insta) return insta;
  }

  // 3. Twitter/X oEmbed + Jina
  if (platform === 'twitter') {
    const oembed = await tryOEmbed(sanitizedUrl);
    if (oembed) return oembed;
  }

  // 4. Everything else: Jina → oEmbed → Scrape
  const strategies = [
    { name: 'Jina', fn: tryJinaReader },
    { name: 'oEmbed', fn: tryOEmbed },
    { name: 'HTMLScrape', fn: tryHtmlScrape }
  ];

  for (const s of strategies) {
    try {
      const result = await s.fn(sanitizedUrl);
      if (result && result.length > 300) {
        logger.info(`Success with strategy ${s.name} for ${sanitizedUrl}`);
        return result;
      }
    } catch (e) {
      logger.warn(`Strategy ${s.name} failed for ${sanitizedUrl}: ${e.message}`);
    }
  }

  // Final fallback (URL only)
  return `URL: ${sanitizedUrl}\nPlatform: ${platform.toUpperCase()}\n\n[Context: The specialized content extractor was unable to reach the page body due to platform restrictions. Please analyze the URL structure above to characterize this bookmark.]`;
};

/**
 * Check if a string looks like a URL.
 */
const isUrl = (str) => {
  try {
    const u = new URL(str.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

module.exports = { extractUrlContent, isUrl };
