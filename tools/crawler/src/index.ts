import { confirm, input, number, select } from '@inquirer/prompts';
import { DEFAULT_AUTH, DEFAULTS } from './config.js';
import { crawlLogExists, readCrawlLog } from './crawl-log.js';
import { runCrawler } from './crawler.js';
import type { AuthConfig, CrawlConfig, CrawlLog, CrawlMode } from './types.js';
import { getOutputDir } from './writer.js';

function isValidUrl(value: string): boolean | string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'URL must use http or https protocol';
    }
    return true;
  } catch {
    return 'Please enter a valid URL';
  }
}

async function promptForAuth(): Promise<AuthConfig> {
  const method = await select({
    message: 'Authentication method:',
    choices: [
      { name: 'None', value: 'none' as const },
      { name: 'Bearer token', value: 'bearer' as const },
      { name: 'Cookie string', value: 'cookie' as const },
      { name: 'Custom headers', value: 'custom-headers' as const },
    ],
  });

  switch (method) {
    case 'bearer': {
      const bearerToken = await input({
        message: 'Bearer token:',
        validate: (v) => (v.trim().length > 0 ? true : 'Token cannot be empty'),
      });
      return { method, bearerToken: bearerToken.trim() };
    }
    case 'cookie': {
      const cookieString = await input({
        message: 'Cookie string (e.g. session=abc123; token=xyz):',
        validate: (v) => (v.trim().length > 0 ? true : 'Cookie string cannot be empty'),
      });
      return { method, cookieString: cookieString.trim() };
    }
    case 'custom-headers': {
      const headersRaw = await input({
        message: 'Headers (key:value pairs, comma-separated, e.g. X-Api-Key:abc,X-Org:123):',
        validate: (v) => (v.trim().length > 0 ? true : 'Headers cannot be empty'),
      });
      const customHeaders: Record<string, string> = {};
      for (const pair of headersRaw.split(',')) {
        const [key, ...rest] = pair.split(':');
        if (key && rest.length > 0) {
          customHeaders[key.trim()] = rest.join(':').trim();
        }
      }
      return { method, customHeaders };
    }
    default:
      return DEFAULT_AUTH;
  }
}

async function promptFreshConfig(baseUrl: string): Promise<CrawlConfig> {
  const mode = await select<CrawlMode>({
    message: 'Crawl mode:',
    choices: [
      { name: 'Whole domain (follow internal links)', value: 'domain' },
      { name: 'Single page only', value: 'single' },
    ],
    default: DEFAULTS.mode,
  });

  let maxDepth = DEFAULTS.maxDepth;
  if (mode === 'domain') {
    maxDepth =
      (await number({
        message: 'Max crawl depth:',
        default: DEFAULTS.maxDepth,
        min: 1,
        max: 20,
      })) ?? DEFAULTS.maxDepth;
  }

  const maxPages =
    (await number({
      message: 'Max pages to crawl:',
      default: DEFAULTS.maxPages,
      min: 1,
      max: 10000,
    })) ?? DEFAULTS.maxPages;

  let urlPattern: string | undefined;
  if (mode === 'domain') {
    const patternInput = await input({
      message: 'URL pattern filter (glob, leave empty for all):',
    });
    if (patternInput.trim()) {
      urlPattern = patternInput.trim();
    }
  }

  const jsRendering = await confirm({
    message: 'Enable JS rendering? (needed for pages that use JavaScript redirects/loading)',
    default: false,
  });

  const auth = await promptForAuth();

  return { baseUrl, mode, maxDepth, maxPages, urlPattern, auth, jsRendering };
}

async function main(): Promise<void> {
  console.log('🕷️  RAG Crawler\n');

  const baseUrl = await input({
    message: 'Base URL to crawl:',
    validate: isValidUrl,
  });

  const outputDir = getOutputDir(baseUrl);
  let existingLog: CrawlLog | null = null;

  // Check for existing crawl log
  if (await crawlLogExists(outputDir)) {
    existingLog = await readCrawlLog(outputDir);

    if (existingLog) {
      const crawledCount = Object.keys(existingLog.crawledUrls).length;
      const pendingCount = existingLog.pendingUrls.length;

      console.log(`\nExisting crawl found: ${crawledCount} pages crawled, ${pendingCount} pending`);

      const shouldResume = await confirm({
        message: 'Resume previous crawl?',
        default: true,
      });

      if (shouldResume) {
        const maxPages =
          (await number({
            message: 'Max total pages (including already crawled):',
            default: Math.max(existingLog.config.maxPages, crawledCount + 50),
            min: crawledCount + 1,
            max: 10000,
          })) ?? existingLog.config.maxPages;

        const config: CrawlConfig = {
          baseUrl: existingLog.baseUrl,
          mode: existingLog.config.mode,
          maxDepth: existingLog.config.maxDepth,
          maxPages,
          urlPattern: existingLog.config.urlPattern,
          auth: existingLog.auth,
          jsRendering: existingLog.config.jsRendering,
        };

        await runCrawler(config, existingLog);
        return;
      }

      // Fresh start — clear existing log
      existingLog = null;
    }
  }

  const config = await promptFreshConfig(baseUrl);
  await runCrawler(config, null);
}

main().catch((err) => {
  // Handle Ctrl+C gracefully
  if (err.name === 'ExitPromptError') {
    console.log('\nCrawl cancelled.');
    process.exit(0);
  }
  console.error('\nCrawl failed:', err);
  process.exit(1);
});
