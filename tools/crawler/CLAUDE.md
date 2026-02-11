# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A CLI web scraper that crawls websites and converts pages to clean Markdown files for use as a RAG data source. Built with **Crawlee** and **TypeScript**.

The tool is part of a larger RAG monorepo (`../../`) and outputs files into `../../_dump/{site-name}/`.

## How It Works

1. User runs the CLI — it interactively prompts for:
   - **Base URL** — the starting page to scrape
   - **Crawl mode** — single page only, or follow internal links across the domain
   - **Max depth** — how many link levels deep to follow (when crawling the whole domain)
   - **Max pages** — upper limit on total pages to scrape (prevents runaway crawls)
   - **URL pattern** — optional glob/regex to include or exclude specific paths (e.g. only `/docs/*`)
   - **Auth** — optional authorization: cookies, Bearer token, or custom headers
2. Crawlee crawls the target, respecting the configured limits
3. Each page's HTML is converted to structured Markdown:
   - Strip images, buttons, navs, footers, ads, scripts, styles, iframes
   - Preserve headings, paragraphs, lists, tables, code blocks, links (as text)
   - Keep semantic structure (heading hierarchy, list nesting)
4. Output is saved as `.md` files in `_dump/{site-name}/`, with filenames derived from URL paths
5. A **crawl log** (`crawl-log.json`) is written to the output directory, recording every crawled URL and its status

## Resumable Crawling

The crawler supports incremental/resumable runs. This is the primary workflow for large sites:

1. User runs the crawler with `maxPages: 100` — it crawls 100 pages and stops
2. User re-runs the CLI pointing to the same site — the crawler reads `crawl-log.json` from the existing output directory, skips all previously crawled URLs, and continues from where it left off
3. The user can increase `maxPages` on each run or keep the same limit — either way, only new pages are crawled

**`crawl-log.json` structure:**
```json
{
  "baseUrl": "https://example.com",
  "config": { "mode": "domain", "maxDepth": 3, "maxPages": 100 },
  "crawledUrls": {
    "https://example.com/": { "file": "index.md", "status": 200, "crawledAt": "..." },
    "https://example.com/docs": { "file": "docs.md", "status": 200, "crawledAt": "..." }
  },
  "pendingUrls": ["https://example.com/docs/api", "..."]
}
```

- `crawledUrls` — URLs already scraped (skipped on re-run)
- `pendingUrls` — discovered but not yet crawled links (used as the starting queue on re-run)
- On resume, the crawler loads pending URLs into the queue and continues discovering new links as normal

## Authorization

The CLI prompts for an optional auth method:
- **None** — no auth (default)
- **Bearer token** — adds `Authorization: Bearer <token>` header to all requests
- **Cookie string** — sets a raw `Cookie` header (e.g. `session=abc123; token=xyz`)
- **Custom headers** — arbitrary key-value headers (for API keys, basic auth, etc.)

Auth config is persisted in `crawl-log.json` (tokens are stored — the file is gitignored via `_dump/` in `.gitignore`). On resume, the previously used auth is reloaded so the user doesn't have to re-enter it.

## Commands

```bash
# Install dependencies
npm install

# Run the CLI (from this directory)
npx tsx src/index.ts

# Run the CLI (from project root)
npx tsx tools/crawler/src/index.ts

# Build
npm run build

# Lint (from monorepo root)
npm run check --workspace=tools/crawler
```

## Tech Stack

- **Crawlee** — web crawling framework (use `CheerioCrawler` for static sites, `PlaywrightCrawler` if JS rendering is needed)
- **TypeScript** — strict mode, ES2023 target, NodeNext module resolution
- **Turndown** — HTML-to-Markdown conversion
- **Inquirer** (or similar) — interactive CLI prompts

## Architecture

```
src/
  index.ts          — CLI entry point: parse args, run interactive prompts, launch crawler
  crawler.ts        — Crawlee crawler setup and configuration
  converter.ts      — HTML → clean Markdown conversion (Turndown + custom rules)
  writer.ts         — File output: directory creation, filename derivation, deduplication
  crawl-log.ts      — Read/write crawl-log.json: track crawled URLs, pending queue, resume state
  types.ts          — Shared TypeScript types and interfaces
  config.ts         — Default values, constants
```

## Output Structure

```
_dump/
  example-com/                  # directory named after the domain
    crawl-log.json              # crawl state: crawled URLs, pending queue, config, auth
    index.md                    # root page
    docs_getting-started.md     # /docs/getting-started → docs_getting-started.md
    docs_api_reference.md       # /docs/api/reference → docs_api_reference.md
    ...
```

- Slashes in URL paths become underscores in filenames
- Query strings and fragments are stripped
- Each `.md` file starts with a YAML front matter block: `title`, `url`, `scraped_at`
- `crawl-log.json` is updated after each page so progress is never lost (crash-safe)

## Code Style

Follows the monorepo conventions (defined in root `biome.json`):
- Single quotes, semicolons, trailing commas
- 2-space indentation, 100-char line width
- `@biomejs/biome` for linting and formatting

## Key Design Decisions

- **CheerioCrawler first** — default to lightweight HTML parsing; only use PlaywrightCrawler when the user indicates the site requires JavaScript rendering
- **Aggressive cleanup** — strip everything non-textual; the output feeds a RAG pipeline that only needs structured text
- **Front matter metadata** — each `.md` file includes source URL and timestamp so documents can be re-crawled and diffed later
- **Respectful crawling** — honor `robots.txt`, add delays between requests, set a descriptive User-Agent
- **Crash-safe log** — `crawl-log.json` is flushed after every page; if the process is killed, re-running resumes cleanly
- **Resume by default** — if the output directory already has a `crawl-log.json`, the CLI detects it and offers to resume (skip already-crawled URLs) or start fresh
- **Auth persisted in log** — so resuming doesn't require re-entering credentials; `_dump/` must be gitignored
