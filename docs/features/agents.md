# Agents

## Overview

Agents are virtual personas that users interact with in the chat. Each agent has a specific role, personality, and knowledge base. Documents are bound to agents, so RAG retrieval only returns documents relevant to the active agent.

## Business Logic

### What is an Agent?

An agent represents a specialized assistant with:
- **Identity**: Name, avatar, description
- **Persona**: System prompt defining personality and behavior
- **Knowledge base**: Set of documents bound to this agent
- **Scope**: Only retrieves from its own documents during chat

### Example Agents

| Agent | Role | Knowledge Base |
|-------|------|----------------|
| Psychologist | Mental health support | Psychology articles, therapy guides |
| Legal Advisor | Legal information | Legal documents, regulations |
| HR Assistant | Employee questions | Company policies, benefits docs |
| Tech Support | Technical help | Product manuals, troubleshooting guides |

### Agent Isolation

When a user chats with an agent:
1. User query is embedded
2. Vector search is filtered by `agentId`
3. Only documents bound to that agent are retrieved
4. Response is generated with agent's persona

```
User → "I'm feeling anxious"
         │
         ▼
    ┌─────────────┐
    │ Psychologist│ ← Active agent
    │   Agent     │
    └─────────────┘
         │
         ▼ Filter: agentId = "psychologist-uuid"
    ┌─────────────┐
    │   Chroma    │ → Only psychology docs returned
    └─────────────┘
         │
         ▼
    Response with psychologist persona
```

## Data Model

### PostgreSQL: Agent

```typescript
{
  id: UUID;
  name: string;              // "Dr. Sarah - Psychologist"
  slug: string;              // "psychologist" (unique, URL-friendly)
  description: string;       // Short description for UI
  systemPrompt: string;      // Persona instructions for LLM
  avatarUrl?: string;        // Optional avatar image
  isActive: boolean;         // Can be disabled
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Document-Agent Relationship

Each document belongs to exactly one agent:

```typescript
// Document model (updated)
{
  id: UUID;
  agentId: UUID;            // Required: bound to agent
  title: string;
  // ... other fields
}
```

### Chroma Metadata

Agent ID included in chunk metadata for filtered search:

```typescript
{
  documentId: string;
  agentId: string;          // For filtering
  chunkIndex: number;
  // ... other metadata
}
```

## API Endpoints

### List Agents (Public)

```
GET /api/agents
```

Returns active agents for chat selection.

### CRUD Agents (Admin)

```
GET    /api/admin/agents
POST   /api/admin/agents
GET    /api/admin/agents/:id
PATCH  /api/admin/agents/:id
DELETE /api/admin/agents/:id
```

### Agent Documents (Admin)

```
GET /api/admin/agents/:id/documents
```

List documents bound to an agent.

## User Stories

- As a user, I want to choose which agent to chat with so I get relevant help
- As a user, I want the agent to respond in character so the experience feels natural
- As an admin, I want to create agents with custom personas so I can serve different use cases
- As an admin, I want to assign documents to agents so each has its own knowledge base

## Acceptance Criteria

- [ ] Agents can be created with name, description, and system prompt
- [ ] Each agent has a unique slug for URL routing
- [ ] Documents must be assigned to an agent on upload
- [ ] Chat queries only search documents for the active agent
- [ ] Agent's system prompt is used in LLM generation
- [ ] Agents can be deactivated (hidden from users)
- [ ] Deleting an agent handles its documents (reassign or delete)

## Technical Notes

### Chroma Filtering

Use Chroma's `where` clause for agent-scoped search:

```typescript
collection.query({
  queryEmbeddings: [embedding],
  where: { agentId: activeAgentId },
  nResults: 5
});
```

### System Prompt Structure

```
{systemPrompt from Agent}

---
Context from knowledge base:
{retrieved chunks}

---
User question: {query}
```

### Default Agent

Consider having a "General Assistant" as default agent for:
- Fallback when no agent selected
- Documents not specific to any persona

## Dependencies

- [Document Upload](./document-upload.md) - Documents bound to agents
- [Document Chunking](./document-chunking.md) - Metadata includes agentId
- Chroma Cloud - Filtered vector search
- PostgreSQL - Agent storage

## Out of Scope

- Multi-agent conversations
- Agent-to-agent handoff
- User-created agents
- Agent analytics/metrics
- Voice/audio personas
