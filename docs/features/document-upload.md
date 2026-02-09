# Document Upload

## Overview

Document upload allows administrators to add documents to the knowledge base. Uploaded documents are stored in MinIO, then processed asynchronously to extract text, chunk content, and generate embeddings for vector search.

## Business Logic

### Access Control

- **Admin only**: Requires valid JWT access token with admin role
- Unauthenticated requests: 401 Unauthorized
- Non-admin users: 403 Forbidden

### File Validation (Synchronous)

Performed immediately on upload:

| Validation | Rule | Error |
|------------|------|-------|
| File size | Max 10MB | 413 Payload Too Large |
| File type | Allowed MIME types only | 415 Unsupported Media Type |
| File name | No path traversal, valid characters | 400 Bad Request |
| Empty file | Size > 0 | 400 Bad Request |
| Agent ID | Valid existing agent UUID | 400 Bad Request |

### Allowed File Types

| Type | MIME Type | Extension |
|------|-----------|-----------|
| Plain text | `text/plain` | `.txt` |
| Markdown | `text/markdown` | `.md` |
| PDF | `application/pdf` | `.pdf` |
| HTML | `text/html` | `.html`, `.htm` |
| Word | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` |

### Processing Flow (Hybrid)

```
┌─────────────────────────────────────────────────────────────────┐
│                      SYNCHRONOUS (API Request)                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Authenticate request (JWT)                                   │
│  2. Validate file (size, type, name)                            │
│  3. Upload to MinIO                                              │
│  4. Create document record in PostgreSQL (status: PENDING)       │
│  5. Queue background job                                         │
│  6. Return 202 Accepted with document ID                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ASYNCHRONOUS (Background Job)                │
├─────────────────────────────────────────────────────────────────┤
│  1. Parse document (extract text)                                │
│  2. Chunk content (per chunking strategy)                        │
│  3. Generate embeddings (Ollama)                                 │
│  4. Store in Qdrant with metadata                                │
│  5. Update document status: COMPLETED or FAILED                  │
└─────────────────────────────────────────────────────────────────┘
```

### Document Status

| Status | Description |
|--------|-------------|
| `PENDING` | Uploaded, awaiting processing |
| `PROCESSING` | Background job in progress |
| `COMPLETED` | Successfully embedded |
| `FAILED` | Processing error (see error field) |

## API Endpoints

### Upload Document

```
POST /api/admin/documents
Content-Type: multipart/form-data
Authorization: Bearer <access_token>

Form fields:
- file: The document file (required)
- agentId: UUID of the agent this document belongs to (required)
- title: Display title (optional, defaults to filename)
```

**Success Response (202 Accepted):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Company Policy",
    "filename": "policy.pdf",
    "mimeType": "application/pdf",
    "size": 245678,
    "status": "PENDING",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "meta": {}
}
```

### Get Document Status

```
GET /api/admin/documents/:id
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Company Policy",
    "filename": "policy.pdf",
    "mimeType": "application/pdf",
    "size": 245678,
    "status": "COMPLETED",
    "chunkCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "processedAt": "2024-01-15T10:30:45.000Z"
  },
  "meta": {}
}
```

### List Documents

```
GET /api/admin/documents
Authorization: Bearer <access_token>
```

### Delete Document

```
DELETE /api/admin/documents/:id
Authorization: Bearer <access_token>
```

Deletes:
- Document record from PostgreSQL
- File from MinIO
- Embeddings from Qdrant

## Data Model

### PostgreSQL: Document

```typescript
{
  id: UUID;
  agentId: UUID;          // Required: bound to agent
  title: string;
  filename: string;
  mimeType: string;
  minioKey: string;
  size: number;           // bytes
  status: DocumentStatus;
  chunkCount?: number;
  error?: string;         // if status = FAILED
  createdAt: DateTime;
  updatedAt: DateTime;
  processedAt?: DateTime;
}
```

## User Stories

- As an admin, I want to upload documents so they become searchable in the chat
- As an admin, I want to see upload progress so I know when documents are ready
- As an admin, I want clear error messages so I can fix upload issues
- As an admin, I want to delete documents so I can remove outdated content

## Acceptance Criteria

- [ ] Only admin users can upload documents
- [ ] Document must be assigned to a valid agent
- [ ] Files over 10MB are rejected with clear error
- [ ] Invalid file types are rejected with clear error
- [ ] Upload returns immediately with document ID (202)
- [ ] Document status can be polled via GET endpoint
- [ ] Background processing chunks and embeds the document
- [ ] Failed processing sets status to FAILED with error message
- [ ] Delete removes document from PostgreSQL, MinIO, and Qdrant
- [ ] List endpoint shows all documents with their status

## Technical Notes

### MinIO Storage Structure

```
documents/
  └── {document-id}/
      └── {original-filename}
```

### Background Job

Use BullMQ with Redis for job queue:
- Queue name: `document-processing`
- Job data: `{ documentId: string }`
- Retries: 3 with exponential backoff

### Error Handling

| Error | Handling |
|-------|----------|
| MinIO upload fails | Return 500, don't create DB record |
| Job queue fails | Return 500, rollback MinIO upload |
| Processing fails | Mark as FAILED, preserve original file |

## Dependencies

- [Agents](./agents.md) - Documents are bound to agents
- [Document Chunking](./document-chunking.md) - Chunking strategy
- MinIO - File storage
- PostgreSQL - Document metadata
- Redis/BullMQ - Job queue
- Qdrant Cloud - Vector storage
- Ollama - Embeddings

## Out of Scope

- Batch/multiple file upload
- Drag-and-drop UI (frontend concern)
- Document versioning
- Document preview/viewing
- Folder organization
