import type { AuthConfig, CrawlMode } from './types.js';

export const DUMP_DIR = '_dump';

export const CRAWL_LOG_FILENAME = 'crawl-log.json';

export const USER_AGENT = 'RAG-Crawler/1.0 (educational project; respectful crawling)';

export const DEFAULTS = {
  mode: 'domain' as CrawlMode,
  maxDepth: 3,
  maxPages: 100,
};

export const ELEMENTS_TO_REMOVE = [
  'script',
  'style',
  'noscript',
  'nav',
  'footer',
  'header',
  'aside',
  'button',
  'form',
  'img',
  'picture',
  'video',
  'audio',
  'iframe',
  'svg',
  'canvas',
  '[role="banner"]',
  '[role="navigation"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
  '.ad',
  '.ads',
  '.advertisement',
  '.social-share',
  '.cookie-banner',
  '.popup',
  '.modal',
];

export const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.content',
  '.post-content',
  '.article-content',
  '.entry-content',
  '#content',
  '#main-content',
];

export const DEFAULT_AUTH: AuthConfig = { method: 'none' };
