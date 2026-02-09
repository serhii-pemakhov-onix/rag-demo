# Document Chunking

## Overview

Document chunking is the process of splitting documents into smaller pieces (chunks) for embedding and storage in the vector database. Uses **LlamaIndex** for chunking orchestration. Proper chunking is critical for effective RAG retrieval - chunks must be small enough for precise matching but large enough to contain meaningful context.

## Business Logic

### Chunking Strategy: Hybrid

Use different chunking approaches based on document type:

| Document Type | Strategy | Rationale |
|---------------|----------|-----------|
| **Markdown** | Recursive by structure | Preserve headings, code blocks, lists as units |
| **PDF** | Page-aware + semantic | Respect page boundaries, split by paragraphs |
| **HTML** | DOM-aware | Split by semantic HTML elements (article, section, p) |
| **Word (.docx)** | Paragraph-based | Use document structure (headings, paragraphs) |
| **Plain text** | Recursive separators | Try `\n\n`, `\n`, `. `, then character limit |

### Chunk Size Parameters

- **Target chunk size**: 512 tokens
- **Overlap**: 100 tokens (between consecutive chunks)
- **Minimum chunk size**: 50 tokens (avoid tiny fragments)
- **Maximum chunk size**: 768 tokens (hard limit)

### Overlap Strategy

Chunks overlap to preserve context across boundaries:

```
Chunk 1: [-------- 512 tokens --------]
Chunk 2:              [-------- 512 tokens --------]
                ↑
           100 token overlap
```

## Supported Document Types

| Format | Extension | Parser |
|--------|-----------|--------|
| Plain text | `.txt` | Direct read |
| Markdown | `.md` | Markdown parser |
| PDF | `.pdf` | PDF.js or similar |
| HTML | `.html`, `.htm` | DOM parser |
| Word | `.docx` | mammoth or docx parser |

## Processing Pipeline

1. **Upload** - File received via API
2. **Store** - Save original to MinIO
3. **Parse** - Extract text based on file type
4. **Clean** - Remove noise (headers, footers, page numbers for PDF)
5. **Chunk** - Split using hybrid strategy
6. **Embed** - Generate embeddings via Ollama (`nomic-embed-text`)
7. **Store vectors** - Save to Qdrant with metadata

## Metadata per Chunk

Each chunk stored in Qdrant includes:

```typescript
{
  documentId: string;      // Reference to source document in PostgreSQL
  agentId: string;         // Agent this document belongs to (for filtering)
  chunkIndex: number;      // Position in document (0, 1, 2...)
  totalChunks: number;     // Total chunks in document
  filename: string;        // Original filename
  mimeType: string;        // Document MIME type
  pageNumber?: number;     // For PDFs
  section?: string;        // Heading/section title if available
}
```

## User Stories

- As an admin, I want to upload documents so that they become searchable
- As a user, I want search results to show relevant excerpts so I understand the context
- As a user, I want the system to handle various document formats so I can upload what I have

## Acceptance Criteria

- [ ] Markdown files are chunked respecting code blocks and headings
- [ ] PDF files are parsed and chunked with page awareness
- [ ] HTML content is extracted and chunked semantically
- [ ] Word documents are parsed and chunked by structure
- [ ] Plain text files are chunked using recursive separators
- [ ] All chunks are within 50-768 token range
- [ ] Chunk overlap is consistently 100 tokens
- [ ] Metadata is attached to each chunk in Qdrant
- [ ] Original documents are preserved in MinIO

## Technical Notes

### Token Counting

Use a tokenizer compatible with `nomic-embed-text`. For estimation, ~4 characters = 1 token.

### Error Handling

- Unsupported file types: Reject with clear error message
- Corrupted files: Log error, skip embedding, mark as failed
- Empty documents: Skip, don't create empty chunks

## Dependencies

- [Agents](./agents.md) - agentId included in chunk metadata
- LlamaIndex (chunking orchestration)
- MinIO (document storage)
- Qdrant (vector storage, collection: `{agent_slug}_articles`)
- Ollama with `nomic-embed-text` (embeddings)
- PostgreSQL (document metadata)

## Out of Scope

- OCR for scanned PDFs (future enhancement)
- Image extraction from documents
- Table extraction and structured parsing
- Real-time re-chunking on strategy change
