import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { CONTENT_SELECTORS, ELEMENTS_TO_REMOVE } from './config.js';
import type { FrontMatter } from './types.js';

type CheerioAPI = cheerio.CheerioAPI;

function buildFrontMatter(meta: FrontMatter): string {
  return [
    '---',
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `url: "${meta.url}"`,
    `scraped_at: "${meta.scraped_at}"`,
    '---',
    '',
  ].join('\n');
}

function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Strip links to plain text — RAG doesn't need hrefs
  turndown.addRule('stripLinks', {
    filter: 'a',
    replacement: (_content, node) => {
      return (node as HTMLElement).textContent || '';
    },
  });

  // Remove any leftover images
  turndown.addRule('removeImages', {
    filter: ['img', 'video', 'iframe', 'picture', 'source'],
    replacement: () => '',
  });

  return turndown;
}

function findMainContent($: CheerioAPI): string {
  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector);
    if (el.length > 0) {
      return el.first().html() || '';
    }
  }
  return $('body').html() || '';
}

function postProcess(markdown: string): string {
  return (
    markdown
      // Collapse 3+ blank lines into 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

export function convertToMarkdown($: CheerioAPI, url: string): string {
  // Extract title
  const title =
    $('title').first().text().trim() || $('h1').first().text().trim() || new URL(url).pathname;

  // Remove unwanted elements
  for (const selector of ELEMENTS_TO_REMOVE) {
    $(selector).remove();
  }

  // Find main content
  const html = findMainContent($);

  // Convert to markdown
  const turndown = createTurndownService();
  const markdown = turndown.turndown(html);

  // Build front matter
  const frontMatter = buildFrontMatter({
    title,
    url,
    scraped_at: new Date().toISOString(),
  });

  return `${frontMatter + postProcess(markdown)}\n`;
}
