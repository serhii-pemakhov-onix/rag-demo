# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack RAG (Retrieval-Augmented Generation) application with:
- **Chat interface** (`/`) - Public chat for querying the knowledge base with streaming responses
- **Admin panel** (`/admin`) - JWT-protected management of documents and images

## Tech Stack

- **Backend**: Nest.js, Prisma, PostgreSQL, Redis, MinIO, Qdrant, LlamaIndex, Ollama
- **Frontend**: React, Vite, Tanstack Router, Tanstack Query, shadcn/ui, Tailwind CSS

## Commands

### Root (monorepo)
```bash
npm run lint              # Biome lint check
npm run lint:fix          # Biome lint with auto-fix
npm run check             # Biome check (lint + format)
npm run check:fix         # Biome check with auto-fix
npm run db:migrate        # Run Prisma migrations
npm run db:generate       # Generate Prisma client
```

### Backend (`apps/api`)
```bash
npm run start:dev         # Development server with watch
npm run build             # Build for production
npm run test              # Run Jest tests
npm run test:watch        # Run tests in watch mode
npm run test -- path/to/file.spec.ts  # Run single test file
npm run migrate           # Run Prisma migrations
npm run generate          # Generate Prisma client
```

### Frontend (`apps/web`)
```bash
npm run dev               # Vite dev server
npm run build             # TypeScript check + Vite build
```

### Infrastructure
```bash
docker compose up -d      # Start PostgreSQL, Redis, MinIO, Qdrant, Mailpit
```

Ollama must be installed locally and running with required models:
- `nomic-embed-text` (embeddings)
- `llama3.2` (chat)
- `llava` (image descriptions)

## Architecture

### Backend Structure (`apps/api/src`)
- `modules/` - Business logic: `auth/`, `chat/`, `agents/`, `documents/`, `images/`, `rag/`
- `providers/` - Third-party integrations: `storage/` (MinIO), `vector/` (Qdrant), `ollama/`, `llamaindex/`
- `prisma/` - Prisma service wrapper
- `common/` - Guards, decorators

### Frontend Structure (`apps/web/src`)
- `routes/` - Tanstack Router file-based routing
- `components/` - React components, `ui/` contains shadcn components
- `hooks/` - Custom hooks including Tanstack Query wrappers
- `api/` - API client functions

### RAG Flow

Uses **LlamaIndex** for RAG orchestration with **Qdrant** as the vector store.

#### Vector Collections (per agent)
- `{agent_slug}_articles` - Text chunks from documents
- `{agent_slug}_images` - Image descriptions

#### Ingestion
1. **Document upload** → Store in MinIO → Parse → Chunk text via LlamaIndex → Embed via Ollama → Store in Qdrant articles collection
2. **Image upload** → Store in MinIO → Generate description via Ollama → Embed description → Store in Qdrant images collection

#### Retrieval
1. **Chat query** → Perform separate retrievals:
   - Search articles collection for relevant text chunks
   - Search images collection for relevant image descriptions
2. Combine context from both sources → Stream LLM response

### Multi-Agent System
Documents and images belong to agents. Each agent has its own pair of Qdrant collections (`{slug}_articles`, `{slug}_images`), system prompt, and optional vision prompt for image description.

## Code Style

- Biome for linting/formatting (configured in `biome.json`)
- Single quotes, semicolons, trailing commas
- Line width: 100 characters
- 2-space indentation

## Code Principles

- **DRY** (Don't Repeat Yourself) - Extract common logic into reusable functions/helpers
- **SRP** (Single Responsibility Principle) - Each module/function should have one clear purpose
- **Create helpers** when logic is reused or when it improves readability
- Keep functions focused and testable
