# Chat

## Overview

Chat is the public-facing interface where users interact with agents via natural language queries. The system retrieves relevant documents and images from the agent's knowledge base using RAG, then generates a response augmented with retrieved context. Responses can contain text, images, and source references.

## Business Logic

### Chat Flow

1. User selects an active agent
2. User types a query (about documents, images, or general questions)
3. Query is embedded using Ollama
4. **Separate vector searches** are performed:
   - Articles collection (`{slug}_articles`) for document chunks
   - Images collection (`{slug}_images`) for image descriptions
5. For image results, the original image URL is resolved from MinIO
6. Agent's system prompt + combined context + user query are sent to Ollama chat model
7. Response is returned with generated text, inline images, and source references

### Agent Selection

- Users must select an agent before chatting
- Only active agents (`isActive: true`) are available for selection
- Agent selection determines the knowledge base scope and persona
- Switching agents starts a new conversation (history is not shared across agents)

### Query Types

| Query Type | Example | Expected Response |
|------------|---------|-------------------|
| Document question | "What is cognitive behavioral therapy?" | Text answer from relevant document chunks |
| Image query | "Show me photos of golden retrievers" | Text description + matching images |
| Mixed query | "What does the architecture diagram show?" | Text explanation + the diagram image |
| General question | "Hello, how can you help me?" | Persona-appropriate greeting (no retrieval needed) |

### Response Format

Each response contains:

- **text**: LLM-generated answer, informed by retrieved context and agent persona
- **images**: Array of image objects (URL + metadata) when image results are relevant
- **sources**: Array of source references (document/image ID, title, relevance score)

### Retrieval Strategy

Uses **LlamaIndex** for RAG orchestration with separate Qdrant collections:

- **Articles retrieval**: Query `{slug}_articles` collection (default: top 5)
- **Images retrieval**: Query `{slug}_images` collection (default: top 3)
- Results are fetched in parallel for performance
- Document chunks provide text context for the LLM prompt
- Image results provide both text context (description) and the image URL for display

### Conversation History

- Chat maintains conversation history within a session
- Previous messages are included in the LLM prompt for multi-turn context
- History is stored client-side (not persisted in database)
- History window is limited to avoid exceeding context length (last N messages)

## Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Sends Message                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Validate: message is non-empty, agentId is valid             │
│  2. Load agent (systemPrompt, slug)                              │
│  3. Embed query using Ollama                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Retrieve Context (Parallel Queries)                 │
├─────────────────────────────────────────────────────────────────┤
│  1. Query {slug}_articles collection:                            │
│     - Limit: top K results (default 5)                           │
│     - Returns: document chunks with metadata                     │
│                                                                  │
│  2. Query {slug}_images collection:                              │
│     - Limit: top K results (default 3)                           │
│     - Returns: image descriptions with metadata                  │
│                                                                  │
│  3. For image matches: resolve MinIO URLs for display            │
│  4. Build context string from retrieved chunks/descriptions      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Generate Response                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Construct LLM prompt:                                        │
│     - System: agent's systemPrompt                               │
│     - Context: retrieved document chunks + image descriptions    │
│     - History: previous messages (last N turns)                  │
│     - User: current query                                        │
│  2. Call Ollama chat model                                       │
│  3. Return: generated text + image URLs + sources                │
└─────────────────────────────────────────────────────────────────┘
```

## User Stories

- As a user, I want to select an agent so that I get responses from the right knowledge base
- As a user, I want to ask questions and get answers based on uploaded documents
- As a user, I want to ask about images and see relevant images in the response
- As a user, I want to see which sources were used to generate the response
- As a user, I want to have a multi-turn conversation where the agent remembers context

## Acceptance Criteria

- [ ] User can select an active agent before chatting
- [ ] Chat endpoint accepts a message and agentId
- [ ] User query is embedded and used for vector similarity search
- [ ] Search is scoped to the selected agent's knowledge base
- [ ] Document chunks are included as context in the LLM prompt
- [ ] Image descriptions are included as context in the LLM prompt
- [ ] Matching images are returned with accessible URLs
- [ ] Agent's system prompt defines the response persona
- [ ] Response includes source references with relevance scores
- [ ] Conversation history is maintained within a session
- [ ] Chat endpoint is publicly accessible (no auth required)
- [ ] Empty or irrelevant queries are handled gracefully

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /chat | Send a message, receive response with text and images | No |

### Request

```typescript
{
  message: string;     // User's query (required, non-empty)
  agentId: string;     // Selected agent UUID (required)
  history?: {          // Previous messages for multi-turn context
    role: 'user' | 'assistant';
    content: string;
  }[];
}
```

### Response

```typescript
{
  response: string;              // LLM-generated text answer
  images: {
    id: string;                  // Image UUID
    url: string;                 // MinIO presigned URL or proxy URL
    filename: string;
    description: string;         // Vision model description
  }[];
  sources: {
    id: string;                  // Document or image UUID
    type: 'document' | 'image'; // Source type
    title: string;               // Document title or image filename
    score: number;               // Similarity score (0-1)
  }[];
}
```

## Data Model

### No New Tables

Chat does not introduce new database tables. It reads from existing models:

- **Agent** - System prompt, slug, active status
- **Document** - Title for source references
- **Image** - Filename, MinIO key for URL resolution, description

### Qdrant Queries

Separate queries to each collection:

```typescript
// Articles retrieval
qdrantClient.search(`${agent.slug}_articles`, {
  vector: queryEmbedding,
  limit: 5,
});

// Images retrieval
qdrantClient.search(`${agent.slug}_images`, {
  vector: queryEmbedding,
  limit: 3,
});
```

## LLM Prompt Structure

```
[System Message]
{agent.systemPrompt}

[Context Message]
Use the following context to answer the user's question. If the context
doesn't contain relevant information, say so honestly.

--- Document Context ---
[1] (source: document-title.pdf, chunk 2/5)
{chunk text}

[2] (source: document-title.md, chunk 1/3)
{chunk text}

--- Image Context ---
[3] (source: photo.jpg)
{image description text}

[Conversation History]
User: {previous user message}
Assistant: {previous assistant response}

[Current Message]
User: {current query}
```

## Technical Notes

### Image URL Resolution

When a Qdrant result contains an `imageId`:
1. Look up the image record in PostgreSQL
2. Get the `minioKey` (format: `images/{agentId}/{imageId}/{filename}`)
3. Generate a presigned URL from MinIO for temporary access

### Relevance Threshold

Results below a minimum similarity threshold should be excluded from context to avoid injecting irrelevant information. The threshold is configurable but defaults to a reasonable value based on the embedding model.

### Context Window Management

- LLM context is limited; the total prompt (system + context + history + query) must fit
- Prioritize higher-scoring chunks when context is limited
- Truncate conversation history if needed (keep most recent turns)
- Reserve sufficient tokens for the response

### Error Handling

| Error | Handling |
|-------|----------|
| Invalid agentId | 400 Bad Request |
| Inactive agent | 400 Bad Request with message |
| Ollama unavailable | 503 Service Unavailable |
| Qdrant unavailable | 503 Service Unavailable |
| Empty search results | Respond without context (agent answers from general knowledge) |
| MinIO URL generation fails | Omit image from response, log error |

### Environment Variables

```bash
OLLAMA_CHAT_MODEL=llama3.2          # Chat LLM model
OLLAMA_EMBEDDING_MODEL=nomic-embed-text  # Query embedding model
```

## Dependencies

- [Agents](./agents.md) - Agent selection, system prompts, knowledge base scoping
- [Document Chunking](./document-chunking.md) - Document chunks stored in Qdrant
- [Image Description](./image-description.md) - Image descriptions embedded in Qdrant
- LlamaIndex - RAG orchestration
- Ollama - Embedding generation and chat completion
- Qdrant - Vector similarity search (`{slug}_articles`, `{slug}_images` collections)
- MinIO - Image URL resolution

## Out of Scope

- Chat history persistence in database
- Streaming responses (SSE/WebSocket)
- File uploads in chat messages
- User authentication for chat access
- Rate limiting
- Response caching
- Feedback/rating on responses
- Citation highlighting in source documents
