# Image Description

## Overview

Image description generates structured textual descriptions of uploaded images using a vision model. These descriptions are embedded and stored in the vector database, enabling semantic search over image content.

## Business Logic

### Purpose

- **Embedding only**: Descriptions are not displayed to users
- Used internally for RAG retrieval when user queries relate to image content
- Enables searching images by content (e.g., "photos of mountains" finds mountain images)

### Vision Model

Configurable via environment variable:

```bash
OLLAMA_VISION_MODEL=x/z-image-turbo:latest
```

### Structured Description Format

The vision model generates descriptions with consistent categories:

```typescript
{
  subject: string;        // Main subject/focus of the image
  setting: string;        // Location, environment, background
  objects: string[];      // Notable objects visible
  colors: string[];       // Dominant colors
  text: string | null;    // Any visible text/writing
  mood: string;           // Emotional tone/atmosphere
  style: string;          // Photo, illustration, diagram, etc.
}
```

### Example Output

For a photo of a sunset over mountains:

```json
{
  "subject": "Mountain landscape at sunset",
  "setting": "Mountain range with valley, golden hour lighting",
  "objects": ["mountains", "trees", "clouds", "sun"],
  "colors": ["orange", "purple", "gold", "dark blue"],
  "text": null,
  "mood": "Peaceful, majestic, serene",
  "style": "Photograph, landscape"
}
```

### Embedding Strategy

The structured description is converted to natural language for embedding:

```
Subject: Mountain landscape at sunset. Setting: Mountain range with valley, golden hour lighting. Objects: mountains, trees, clouds, sun. Colors: orange, purple, gold, dark blue. Mood: Peaceful, majestic, serene. Style: Photograph, landscape.
```

This text is then embedded using `nomic-embed-text-v2-moe` with prefix `search_document:`.

## Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Image Upload (Synchronous)                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Validate image (size, type)                                  │
│  2. Upload to MinIO                                              │
│  3. Create image record (status: PENDING)                        │
│  4. Queue background job                                         │
│  5. Return 202 Accepted                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Description Generation (Async Job)                 │
├─────────────────────────────────────────────────────────────────┤
│  1. Fetch image from MinIO                                       │
│  2. Send to Ollama vision model with structured prompt           │
│  3. Parse structured response                                    │
│  4. Convert to embedding text                                    │
│  5. Generate embedding (nomic-embed-text-v2-moe)                │
│  6. Store in Chroma with metadata                                │
│  7. Update image status: COMPLETED                               │
└─────────────────────────────────────────────────────────────────┘
```

## Vision Model Prompt

```
Analyze this image and provide a structured description in JSON format:

{
  "subject": "Main subject or focus of the image",
  "setting": "Location, environment, or background",
  "objects": ["list", "of", "notable", "objects"],
  "colors": ["dominant", "colors"],
  "text": "Any visible text, or null if none",
  "mood": "Emotional tone or atmosphere",
  "style": "Type: photo, illustration, diagram, screenshot, etc."
}

Respond with valid JSON only.
```

## Data Model

### PostgreSQL: Image

```typescript
{
  id: UUID;
  agentId: UUID;              // Bound to agent
  filename: string;
  mimeType: string;
  minioKey: string;
  size: number;
  description: JSON | null;   // Structured description
  status: ImageStatus;        // PENDING, PROCESSING, COMPLETED, FAILED
  error?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  processedAt?: DateTime;
}
```

### Chroma Metadata

```typescript
{
  imageId: string;
  agentId: string;
  filename: string;
  mimeType: string;
  subject: string;            // For additional filtering
  style: string;              // Photo, diagram, etc.
}
```

## Supported Image Types

| Format | MIME Type | Extension |
|--------|-----------|-----------|
| JPEG | `image/jpeg` | `.jpg`, `.jpeg` |
| PNG | `image/png` | `.png` |
| WebP | `image/webp` | `.webp` |
| GIF | `image/gif` | `.gif` |

## User Stories

- As a user, I want to search for images by describing their content
- As an admin, I want uploaded images automatically described for search
- As a user, I want relevant images included in RAG responses

## Acceptance Criteria

- [ ] Images are processed asynchronously after upload
- [ ] Vision model generates structured JSON description
- [ ] Description is converted to natural language for embedding
- [ ] Embeddings are stored in Chroma with agentId filter
- [ ] Failed processing sets status to FAILED with error
- [ ] Vision model is configurable via OLLAMA_VISION_MODEL env var

## Technical Notes

### Error Handling

| Error | Handling |
|-------|----------|
| Vision model unavailable | Retry 3x, then mark FAILED |
| Invalid JSON response | Retry with simplified prompt, then mark FAILED |
| Image too large for model | Resize before sending |
| Unsupported format | Reject on upload validation |

### Image Preprocessing

Before sending to vision model:
- Resize if larger than 1024px on longest side
- Convert to base64 for Ollama API

### Environment Variables

```bash
OLLAMA_VISION_MODEL=x/z-image-turbo:latest
```

## Dependencies

- [Agents](./agents.md) - Images bound to agents
- [Document Chunking](./document-chunking.md) - Embedding strategy
- MinIO - Image storage
- Ollama - Vision model
- Chroma Cloud - Vector storage

## Out of Scope

- OCR for text-heavy images (use description's `text` field)
- Image editing/manipulation
- Thumbnail generation
- Multiple descriptions per image
- User-provided descriptions
