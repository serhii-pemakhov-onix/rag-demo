# Image Description

## Overview

Image description generates structured textual descriptions of uploaded images using a vision model. These descriptions are embedded and stored in the vector database, enabling semantic search over image content.

## Business Logic

### Purpose

- **Embedding only**: Descriptions are stored but primarily used for RAG retrieval
- Used internally for RAG retrieval when user queries relate to image content
- Enables searching images by content (e.g., "photos of mountains" finds mountain images)
- Descriptions are also stored in PostgreSQL for display in admin UI

### Vision Model

Configurable via environment variable:

```bash
OLLAMA_VISION_MODEL=llava
```

### Agent-Specific Vision Instructions

Each agent can have a custom `visionPromptInstruction` that **replaces** the default vision prompt entirely. This allows different agents to have complete control over how images are analyzed:

- **If `visionPromptInstruction` is set**: Uses ONLY the agent's custom instruction, raw text response is used directly for embedding
- **If `visionPromptInstruction` is empty**: Uses the default structured JSON prompt

Example agent configurations:

```
Agent: Pet Store Bot
visionPromptInstruction: "Describe this pet image in detail. Include breed identification, physical traits, approximate age, health condition indicators, and any context about the setting or accessories visible."

Agent: Technical Documentation Bot
visionPromptInstruction: "Analyze this technical diagram. Describe the components, their relationships, data flow, and any labels or text visible. Focus on architecture and system design aspects."

Agent: Product Catalog Bot
visionPromptInstruction: "Describe this product image for a catalog. Include product type, brand if visible, colors, features, condition, and any promotional text or pricing shown."
```

**Output modes**:
- **Custom instruction**: Raw text response used directly for embedding (stored as `{ rawText: "..." }`)
- **Default prompt**: Structured JSON parsed and converted to embedding text (stored as structured `ImageDescription`)

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

This text is then embedded using `nomic-embed-text` (configurable via `OLLAMA_EMBEDDING_MODEL`).

## Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Image Upload (Synchronous)                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Validate image (size ≤ 5MB, type: jpeg/png/webp/avif/gif)        │
│  2. Upload to MinIO (key: {agentId}/{imageId}/{filename})       │
│  3. Create image record (status: PENDING)                        │
│  4. Trigger async processing (non-blocking)                      │
│  5. Return 202 Accepted                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Description Generation (Async)                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Update status: PROCESSING                                    │
│  2. Fetch image from MinIO                                       │
│  3. Fetch agent's visionPromptInstruction                        │
│  4. Send to Ollama vision model with prompt:                     │
│     - IF visionPromptInstruction exists: use it exclusively      │
│     - ELSE: use default structured JSON prompt                   │
│  5. Process response:                                            │
│     - Custom instruction: use raw text directly for embedding    │
│     - Default prompt: parse JSON, convert to embedding text      │
│  6. Generate embedding (nomic-embed-text)                        │
│  7. Store in Qdrant (collection: {slug}_images)                  │
│  8. Update status: COMPLETED, store description                  │
└─────────────────────────────────────────────────────────────────┘
```

## Vision Model Prompt

### Default Prompt (when agent has no visionPromptInstruction)

```
Analyze this image and provide a structured description in JSON format.

Output format (respond with valid JSON only):
{
  "subject": "Main subject or focus of the image",
  "setting": "Location, environment, or background",
  "objects": ["list", "of", "notable", "objects"],
  "colors": ["dominant", "colors"],
  "text": "Any visible text, or null if none",
  "mood": "Emotional tone or atmosphere",
  "style": "Type: photo, illustration, diagram, screenshot, etc."
}
```

### Custom Prompt (when agent has visionPromptInstruction)

The agent's `visionPromptInstruction` is used as the complete prompt. The raw text response from the vision model is used directly for embedding - no JSON parsing is attempted.

This allows agents to use natural language prompts like:
- "Describe this dog image including breed, age, and physical characteristics"
- "Analyze this technical diagram and explain the architecture"

The raw text response provides richer, more natural descriptions for semantic search.

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

### Qdrant Metadata

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

- [x] Images are processed asynchronously after upload
- [x] Vision model generates structured JSON description
- [x] Agent's `visionPromptInstruction` replaces default prompt, raw text used for embedding
- [x] Description is converted to natural language for embedding
- [x] Embeddings are stored in Qdrant with agentId filter
- [x] Failed processing sets status to FAILED with error
- [x] Vision model is configurable via OLLAMA_VISION_MODEL env var
- [x] Image deletion removes embeddings from vector database

## Technical Notes

### Error Handling

| Error | Handling |
|-------|----------|
| Vision model unavailable | Mark FAILED with error message |
| Invalid JSON response (default prompt) | Use raw text for embedding, store as `{ rawText: "..." }` |
| Unsupported format | Reject on upload validation |

### Image Preprocessing

Before sending to vision model:
- Convert to base64 for Ollama API

### Deletion Cleanup

When an image is deleted:
1. File removed from MinIO storage
2. Embedding removed from Qdrant vector database (collection: `{slug}_images`, id: `image_{imageId}`)
3. Record removed from PostgreSQL

### Environment Variables

```bash
OLLAMA_VISION_MODEL=llava  # or any Ollama model with vision capability
```

## Dependencies

- [Agents](./agents.md) - Images bound to agents
- [Document Chunking](./document-chunking.md) - Embedding strategy
- MinIO - Image storage
- Ollama - Vision model
- Qdrant - Vector storage

## Out of Scope

- OCR for text-heavy images (use description's `text` field)
- Image editing/manipulation
- Thumbnail generation
- Multiple descriptions per image
- User-provided descriptions
