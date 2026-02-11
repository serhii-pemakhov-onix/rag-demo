import {
  CheerioCrawler,
  type CheerioCrawlingContext,
  Configuration,
  PlaywrightCrawler,
  type PlaywrightCrawlingContext,
} from 'crawlee';
import { USER_AGENT } from './config.js';
import { convertToMarkdown } from './converter.js';
import { addPendingUrls, createCrawlLog, recordCrawledUrl, writeCrawlLog } from './crawl-log.js';
import type { AuthConfig, CrawlConfig, CrawlLog } from './types.js';
import { ensureOutputDir, getOutputDir, normalizeUrl, writeMarkdownFile } from './writer.js';

function buildAuthHeaders(auth: AuthConfig): Record<string, string> {
  switch (auth.method) {
    case 'bearer':
      return { Authorization: `Bearer ${auth.bearerToken}` };
    case 'cookie':
      return { Cookie: auth.cookieString! };
    case 'custom-headers':
      return { ...auth.customHeaders };
    default:
      return {};
  }
}

function matchesUrlPattern(url: string, pattern: string | undefined): boolean {
  if (!pattern) {
    return true;
  }

  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  return new RegExp(regexStr).test(url);
}

export async function runCrawler(config: CrawlConfig, existingLog: CrawlLog | null): Promise<void> {
  const outputDir = getOutputDir(config.baseUrl);
  await ensureOutputDir(outputDir);

  const log = existingLog ?? createCrawlLog(config);
  const alreadyCrawled = Object.keys(log.crawledUrls).length;
  const remainingPages = config.maxPages - alreadyCrawled;

  if (remainingPages <= 0) {
    console.log(
      `\nAlready crawled ${alreadyCrawled} pages (limit: ${config.maxPages}). Nothing to do.`,
    );
    console.log('Increase maxPages to crawl more.');
    return;
  }

  const startUrls =
    existingLog && log.pendingUrls.length > 0 ? [...log.pendingUrls] : [config.baseUrl];

  const authHeaders = buildAuthHeaders(config.auth);
  const isResuming = existingLog !== null;
  const shouldEnqueueLinks = config.mode === 'domain' && !isResuming;
  const baseHostname = new URL(config.baseUrl).hostname;

  console.log(`\nStarting crawl of ${config.baseUrl}`);
  console.log(
    `Mode: ${config.mode} | Max depth: ${config.maxDepth} | Remaining pages: ${remainingPages}`,
  );
  if (config.jsRendering) {
    console.log('JS rendering: enabled (Playwright)');
  }
  if (alreadyCrawled > 0) {
    console.log(
      `Resuming: ${alreadyCrawled} pages already crawled, ${log.pendingUrls.length} pending`,
    );
  }
  console.log('');

  let crawledCount = 0;

  const crawleeConfig = new Configuration({
    storageClientOptions: {
      localDataDirectory: `${outputDir}/.crawlee-storage`,
    },
    purgeOnStart: true,
  });

  async function handlePage(
    url: string,
    $: Parameters<typeof convertToMarkdown>[0],
    statusCode: number,
  ): Promise<void> {
    console.log(`  [${crawledCount + 1}] ${url}`);

    const markdown = convertToMarkdown($, url);
    const filename = await writeMarkdownFile(outputDir, url, markdown);

    await recordCrawledUrl(outputDir, log, url, {
      file: filename,
      status: statusCode,
      crawledAt: new Date().toISOString(),
    });

    crawledCount++;
  }

  async function handleEnqueueLinks(
    enqueueLinks: (options: Record<string, unknown>) => Promise<{ processedRequests: unknown[] }>,
  ): Promise<void> {
    const enqueued = await enqueueLinks({
      strategy: 'same-hostname',
      globs: config.urlPattern ? [config.urlPattern] : undefined,
      transformRequestFunction: (req: { url: string }) => {
        const normalized = normalizeUrl(req.url);
        // Only allow URLs from the same hostname
        if (new URL(normalized).hostname !== baseHostname) {
          return false;
        }
        if (log.crawledUrls[normalized]) {
          return false;
        }
        req.url = normalized;
        addPendingUrls(log, [normalized]);
        return req;
      },
    });

    if (enqueued.processedRequests.length > 0) {
      await writeCrawlLog(outputDir, log);
    }
  }

  async function handleFailure(requestUrl: string, error: Error): Promise<void> {
    const url = normalizeUrl(requestUrl);
    console.log(`  [FAILED] ${url} — ${error.message}`);

    await recordCrawledUrl(outputDir, log, url, {
      file: '',
      status: 0,
      crawledAt: new Date().toISOString(),
    });
  }

  const crawler = config.jsRendering
    ? new PlaywrightCrawler(
        {
          maxRequestsPerCrawl: remainingPages,
          maxConcurrency: 1,
          requestHandlerTimeoutSecs: 120,
          navigationTimeoutSecs: 60,

          preNavigationHooks: [
            async (ctx, gotoOptions) => {
              gotoOptions.waitUntil = 'networkidle';

              // Set auth before navigation so cookies/headers are sent with the request
              if (config.auth.method === 'cookie' && config.auth.cookieString) {
                const baseHost = new URL(config.baseUrl).hostname;
                const cookies = config.auth.cookieString.split(';').map((c) => {
                  const [name, ...rest] = c.trim().split('=');
                  return {
                    name: name.trim(),
                    value: rest.join('=').trim(),
                    domain: baseHost,
                    path: '/',
                  };
                });
                await ctx.page.context().addCookies(cookies);
              } else if (Object.keys(authHeaders).length > 0) {
                await ctx.page.setExtraHTTPHeaders(authHeaders);
              }
            },
          ],

          launchContext: {
            launchOptions: {
              args: ['--disable-gpu'],
            },
            userAgent: USER_AGENT,
          },

          async requestHandler(ctx: PlaywrightCrawlingContext) {
            const { request, response, parseWithCheerio, enqueueLinks } = ctx;

            const url = normalizeUrl(request.loadedUrl || request.url);

            if (log.crawledUrls[url] || !matchesUrlPattern(url, config.urlPattern)) {
              return;
            }

            const $ = await parseWithCheerio();
            await handlePage(
              url,
              $ as Parameters<typeof convertToMarkdown>[0],
              response?.status() ?? 200,
            );

            if (shouldEnqueueLinks) {
              await handleEnqueueLinks(enqueueLinks as Parameters<typeof handleEnqueueLinks>[0]);
            }
          },

          async failedRequestHandler({ request }, error) {
            await handleFailure(request.url, error);
          },
        },
        crawleeConfig,
      )
    : new CheerioCrawler(
        {
          maxRequestsPerCrawl: remainingPages,
          maxConcurrency: 1,
          sameDomainDelaySecs: 1,

          preNavigationHooks: [
            (_ctx, gotOptions) => {
              gotOptions.headers = {
                ...gotOptions.headers,
                'User-Agent': USER_AGENT,
                ...authHeaders,
              };
            },
          ],

          async requestHandler(ctx: CheerioCrawlingContext) {
            const { request, $, response, enqueueLinks } = ctx;
            const url = normalizeUrl(request.loadedUrl || request.url);

            if (log.crawledUrls[url] || !matchesUrlPattern(url, config.urlPattern)) {
              return;
            }

            await handlePage(
              url,
              $ as Parameters<typeof convertToMarkdown>[0],
              response.statusCode ?? 200,
            );

            if (shouldEnqueueLinks) {
              await handleEnqueueLinks(enqueueLinks as Parameters<typeof handleEnqueueLinks>[0]);
            }
          },

          async failedRequestHandler({ request }, error) {
            await handleFailure(request.url, error);
          },
        },
        crawleeConfig,
      );

  await crawler.run(startUrls);

  // Final flush
  await writeCrawlLog(outputDir, log);

  const totalCrawled = Object.keys(log.crawledUrls).length;
  const pending = log.pendingUrls.length;

  console.log('\n--- Crawl Complete ---');
  console.log(`Total pages crawled: ${totalCrawled}`);
  console.log(`Pages crawled this run: ${crawledCount}`);
  if (pending > 0) {
    console.log(`Pending URLs remaining: ${pending}`);
    console.log('Re-run to continue crawling.');
  }
  console.log(`Output: ${outputDir}`);
}
