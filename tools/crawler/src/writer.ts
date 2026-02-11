import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DUMP_DIR } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');

export function getOutputDir(baseUrl: string): string {
  const url = new URL(baseUrl);
  const dirName = url.hostname.replace(/\./g, '-');
  return join(PROJECT_ROOT, DUMP_DIR, dirName);
}

export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.search = '';
  url.hash = '';
  // Remove trailing slash (but keep root "/")
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function deriveFilename(url: string): string {
  const parsed = new URL(url);
  let pathname = parsed.pathname;

  // Strip trailing slash
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Root page
  if (pathname === '/' || pathname === '') {
    return 'index.md';
  }

  // Remove leading slash, replace remaining slashes with underscores
  const name = pathname
    .slice(1)
    .replace(/\//g, '_')
    .replace(/\.html?$/i, '');

  return `${name}.md`;
}

export async function ensureOutputDir(outputDir: string): Promise<void> {
  await mkdir(outputDir, { recursive: true });
}

export async function writeMarkdownFile(
  outputDir: string,
  url: string,
  markdown: string,
): Promise<string> {
  const filename = deriveFilename(url);
  const filePath = join(outputDir, filename);
  await writeFile(filePath, markdown, 'utf-8');
  return filename;
}
