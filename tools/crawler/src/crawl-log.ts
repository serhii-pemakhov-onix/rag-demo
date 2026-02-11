import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CRAWL_LOG_FILENAME } from './config.js';
import type { CrawlConfig, CrawledUrlEntry, CrawlLog } from './types.js';

function getLogPath(outputDir: string): string {
  return join(outputDir, CRAWL_LOG_FILENAME);
}

export async function crawlLogExists(outputDir: string): Promise<boolean> {
  try {
    await access(getLogPath(outputDir));
    return true;
  } catch {
    return false;
  }
}

export async function readCrawlLog(outputDir: string): Promise<CrawlLog | null> {
  try {
    const raw = await readFile(getLogPath(outputDir), 'utf-8');
    return JSON.parse(raw) as CrawlLog;
  } catch {
    return null;
  }
}

export async function writeCrawlLog(outputDir: string, log: CrawlLog): Promise<void> {
  await writeFile(getLogPath(outputDir), `${JSON.stringify(log, null, 2)}\n`, 'utf-8');
}

export function createCrawlLog(config: CrawlConfig): CrawlLog {
  return {
    baseUrl: config.baseUrl,
    config: {
      mode: config.mode,
      maxDepth: config.maxDepth,
      maxPages: config.maxPages,
      urlPattern: config.urlPattern,
    },
    auth: config.auth,
    crawledUrls: {},
    pendingUrls: [],
  };
}

export async function recordCrawledUrl(
  outputDir: string,
  log: CrawlLog,
  url: string,
  entry: CrawledUrlEntry,
): Promise<void> {
  log.crawledUrls[url] = entry;
  // Remove from pending if present
  const idx = log.pendingUrls.indexOf(url);
  if (idx !== -1) {
    log.pendingUrls.splice(idx, 1);
  }
  await writeCrawlLog(outputDir, log);
}

export function addPendingUrls(log: CrawlLog, urls: string[]): void {
  for (const url of urls) {
    if (!log.crawledUrls[url] && !log.pendingUrls.includes(url)) {
      log.pendingUrls.push(url);
    }
  }
}
