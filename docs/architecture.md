# RAG Demo - Architecture

## Overview

A full-stack RAG (Retrieval-Augmented Generation) application with an admin panel for managing knowledge base content and a public chat interface for querying the system.

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | Nest.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache | Redis |
| File Storage | MinIO |
| Vector Database | Qdrant |
| RAG Framework | LlamaIndex |
| LLM/Embeddings | Ollama |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React |
| Routing | Tanstack Router |
| Data Fetching | Tanstack Query |
| UI Components | shadcn/ui |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Frontend                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │     Chat Interface (/)      │  │    Admin Panel (/admin)     │   │
│  │   - Message input           │  │   - Article management      │   │
│  │   - Chat history            │  │   - Image management        │   │
│  │   - Streaming responses     │  │   - Protected by JWT auth   │   │
│  └─────────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Nest.js API                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Auth Module  │  │ Chat Module  │  │     Admin Module         │   │
│  │ - Login      │  │ - Query RAG  │  │ - Articles CRUD          │   │
│  │ - Refresh    │  │ - Stream     │  │ - Images CRUD            │   │
│  │ - JWT Guard  │  │   response   │  │ - Trigger embedding      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 RAG Service (LlamaIndex)                      │   │
│  │  - Document chunking via LlamaIndex                           │   │
│  │  - Embedding generation (via Ollama)                          │   │
│  │  - Image description generation (via Ollama)                  │   │
│  │  - Separate retrieval for articles and images                 │   │
│  │  - Context-augmented response generation                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │    MinIO     │ │    Qdrant    │
│              │ │              │ │              │ │              │
│ - Users      │ │ - Token      │ │ - Articles   │ │ - {slug}_    │
│ - Articles   │ │   blacklist  │ │   (files)    │ │   articles   │
│ - Images     │ │ - Cache      │ │ - Images     │ │ - {slug}_    │
│   (metadata) │ │              │ │              │ │   images     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │    Ollama    │
                                                   │              │
                                                   │ - Embeddings │
                                                   │ - Image      │
                                                   │   description│
                                                   │ - Chat LLM   │
                                                   └──────────────┘
```

## Authentication Flow

```
┌────────┐                          ┌─────────┐                    ┌───────────┐
│ Client │                          │   API   │                    │ PostgreSQL│
└───┬────┘                          └────┬────┘                    └─────┬─────┘
    │                                    │                               │
    │  POST /auth/login                  │                               │
    │  {email, password}                 │                               │
    │───────────────────────────────────>│                               │
    │                                    │  Validate credentials         │
    │                                    │──────────────────────────────>│
    │                                    │<──────────────────────────────│
    │                                    │                               │
    │  {accessToken, refreshToken}       │                               │
    │<───────────────────────────────────│                               │
    │                                    │                               │
    │  GET /admin/* (with accessToken)   │                               │
    │───────────────────────────────────>│                               │
    │                                    │  Verify JWT                   │
    │  Protected resource                │                               │
    │<───────────────────────────────────│                               │
    │                                    │                               │
    │  POST /auth/refresh                │                               │
    │  {refreshToken}                    │                               │
    │───────────────────────────────────>│                               │
    │                                    │  Validate refresh token       │
    │  {accessToken, refreshToken}       │                               │
    │<───────────────────────────────────│                               │
```

### JWT Token Strategy
- **Access Token**: Short-lived (15 min), used for API authorization
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
- **Storage**: Access token in memory, refresh token in httpOnly cookie

## RAG Pipeline

Uses **LlamaIndex** for RAG orchestration with **Qdrant** as the vector store.

### Vector Collections (per agent)

Each agent has two separate Qdrant collections:
- `{agent_slug}_articles` - Text chunks from documents
- `{agent_slug}_images` - Image descriptions

### Article Processing Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Upload    │     │    Store     │     │    Chunk     │     │    Embed     │
│   Article    │────>│   in MinIO   │────>│  (LlamaIndex)│────>│   Chunks     │
│              │     │              │     │              │     │   (Ollama)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                                         │
                            ▼                                         ▼
                     ┌──────────────┐                          ┌──────────────┐
                     │  PostgreSQL  │                          │    Qdrant    │
                     │  (metadata)  │                          │ {slug}_articles│
                     └──────────────┘                          └──────────────┘
```

### Image Processing Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Upload    │     │    Store     │     │   Generate   │     │    Embed     │
│    Image     │────>│   in MinIO   │────>│  Description │────>│ Description  │
│              │     │              │     │   (Ollama)   │     │   (Ollama)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                                         │
                            ▼                                         ▼
                     ┌──────────────┐                          ┌──────────────┐
                     │  PostgreSQL  │                          │    Qdrant    │
                     │  (metadata)  │                          │ {slug}_images │
                     └──────────────┘                          └──────────────┘
```

### Query Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│    User      │     │    Embed     │     │   Separate Retrieval │     │   Generate   │
│   Question   │────>│    Query     │────>│   - articles search  │────>│   Response   │
│              │     │   (Ollama)   │     │   - images search    │     │   (Ollama)   │
└──────────────┘     └──────────────┘     └──────────────────────┘     └──────────────┘
                                                    │                        │
                                                    ▼                        │
                                             ┌──────────────┐                │
                                             │    MinIO     │                │
                                             │ (fetch docs) │────────────────┘
                                             └──────────────┘         (context)
```

## Data Models

### PostgreSQL Schema

```
┌─────────────────────────────┐
│           User              │
├─────────────────────────────┤
│ id: UUID (PK)               │
│ email: String (unique)      │
│ passwordHash: String        │
│ createdAt: DateTime         │
│ updatedAt: DateTime         │
└─────────────────────────────┘

┌─────────────────────────────┐
│          Article            │
├─────────────────────────────┤
│ id: UUID (PK)               │
│ title: String               │
│ filename: String            │
│ mimeType: String            │
│ minioKey: String            │
│ size: Int                   │
│ isEmbedded: Boolean         │
│ createdAt: DateTime         │
│ updatedAt: DateTime         │
└─────────────────────────────┘

┌─────────────────────────────┐
│           Image             │
├─────────────────────────────┤
│ id: UUID (PK)               │
│ filename: String            │
│ mimeType: String            │
│ minioKey: String            │
│ size: Int                   │
│ description: String?        │
│ isEmbedded: Boolean         │
│ createdAt: DateTime         │
│ updatedAt: DateTime         │
└─────────────────────────────┘

┌─────────────────────────────┐
│       RefreshToken          │
├─────────────────────────────┤
│ id: UUID (PK)               │
│ token: String (unique)      │
│ userId: UUID (FK)           │
│ expiresAt: DateTime         │
│ createdAt: DateTime         │
└─────────────────────────────┘
```

### Qdrant Collections

Per-agent collections for isolated knowledge bases:
- **{agent_slug}_articles**: Stores article chunk embeddings with metadata (articleId, chunkIndex)
- **{agent_slug}_images**: Stores image description embeddings with metadata (imageId)

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | Sign in with email/password | No |
| POST | /auth/refresh | Refresh access token | No |
| POST | /auth/logout | Invalidate refresh token | Yes |

### Chat
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /chat | Send message, receive streamed response | No |

### Admin - Articles
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /admin/articles | List all articles | Yes |
| POST | /admin/articles | Upload article | Yes |
| DELETE | /admin/articles/:id | Delete article | Yes |

### Admin - Images
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /admin/images | List all images | Yes |
| POST | /admin/images | Upload image | Yes |
| DELETE | /admin/images/:id | Delete image | Yes |

## Project Structure

```
rag-demo/
├── apps/
│   ├── api/                      # Nest.js backend
│   │   ├── src/
│   │   │   ├── common/           # Shared utilities
│   │   │   │   ├── decorators/   # Custom decorators
│   │   │   │   └── guards/       # Global guards
│   │   │   ├── prisma/           # Prisma service
│   │   │   ├── modules/          # Business logic modules
│   │   │   │   ├── auth/         # Authentication module
│   │   │   │   ├── chat/         # Chat module
│   │   │   │   ├── admin/        # Admin module
│   │   │   │   └── rag/          # RAG service
│   │   │   └── providers/        # Third-party service modules
│   │   │       ├── storage/      # MinIO service
│   │   │       ├── vector/       # Qdrant service
│   │   │       ├── llamaindex/   # LlamaIndex service
│   │   │       └── ollama/       # Ollama service
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts           # Admin user seed
│   │   └── package.json
│   │
│   └── web/                      # React frontend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── index.tsx     # Chat page
│       │   │   └── admin/
│       │   │       ├── index.tsx     # Admin dashboard
│       │   │       ├── articles.tsx  # Article management
│       │   │       └── images.tsx    # Image management
│       │   ├── components/
│       │   ├── hooks/
│       │   └── api/              # Tanstack Query hooks
│       └── package.json
│
├── docker-compose.yml            # Local dev infrastructure
└── docs/
    └── architecture.md
```

## Infrastructure (Docker Compose)

Services for local development:
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis cache (port 6379)
- **minio**: MinIO object storage (port 9000, console 9001)
- **qdrant**: Qdrant vector database (port 6333, gRPC 6334)
- **mailpit**: Email testing server (SMTP 1025, UI 8025)

### External Services

- **Ollama**: Install locally from https://ollama.ai (port 11434)
  ```bash
  # Required models
  ollama pull nomic-embed-text  # Embeddings
  ollama pull llama3.2          # Chat
  ollama pull llava             # Image descriptions
  ```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ragdemo

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ragdemo

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Ollama
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=llama3.2
OLLAMA_VISION_MODEL=llava

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```
