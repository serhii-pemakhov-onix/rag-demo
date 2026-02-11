export type CrawlMode = 'single' | 'domain';

export type AuthMethod = 'none' | 'bearer' | 'cookie' | 'custom-headers';

export interface AuthConfig {
  method: AuthMethod;
  bearerToken?: string;
  cookieString?: string;
  customHeaders?: Record<string, string>;
}

export interface CrawlConfig {
  baseUrl: string;
  mode: CrawlMode;
  maxDepth: number;
  maxPages: number;
  urlPattern?: string;
  auth: AuthConfig;
  jsRendering?: boolean;
}

export interface CrawledUrlEntry {
  file: string;
  status: number;
  crawledAt: string;
}

export interface CrawlLog {
  baseUrl: string;
  config: Omit<CrawlConfig, 'baseUrl' | 'auth'>;
  auth: AuthConfig;
  crawledUrls: Record<string, CrawledUrlEntry>;
  pendingUrls: string[];
}

export interface FrontMatter {
  title: string;
  url: string;
  scraped_at: string;
}
