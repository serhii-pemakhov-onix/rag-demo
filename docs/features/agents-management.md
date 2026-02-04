# Agents Management

## Overview

A dedicated admin page for managing agents with full CRUD capabilities, pagination, and status toggling. This provides administrators with a centralized interface to view, create, edit, activate/deactivate, and delete agents.

## Business Logic

- Agents are AI assistants with specific system prompts and optional vision instructions
- Each agent has a unique slug (auto-generated from name) that cannot be changed after creation
- Agents can be active or inactive - inactive agents are not available for chat
- Deleting an agent also removes all associated documents and images
- Pagination prevents performance issues when many agents exist

## User Stories

- As an admin, I want to see a list of all agents so that I can manage them
- As an admin, I want to create new agents so that I can add specialized assistants
- As an admin, I want to edit agent details so that I can update their behavior
- As an admin, I want to activate/deactivate agents so that I can control availability without deleting
- As an admin, I want to delete agents so that I can remove ones no longer needed
- As an admin, I want paginated results so that the page loads quickly with many agents

## Acceptance Criteria

- [x] Agents list page accessible at `/admin/agents`
- [x] List displays: Name, Slug, Description, Status (Active/Inactive), Actions
- [x] Pagination with 10 items per page
- [x] Create button opens AddAgentDialog
- [x] Edit button navigates to `/admin/agents/:id`
- [x] Activate/Deactivate button toggles agent status immediately
- [x] Delete button shows confirmation dialog before deletion
- [x] Edit page shows all editable fields (name, description, systemPrompt, visionPromptInstruction, isActive)
- [x] Slug is displayed but not editable on edit page
- [x] Navigation includes "Agents" link in sidebar

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /agents | Get all agents (unpaginated, backward compatible) |
| GET | /agents?page=1&limit=10 | Get paginated agents |
| GET | /agents/:id | Get single agent with system prompt |
| POST | /agents | Create new agent (Admin only) |
| PUT | /agents/:id | Update agent (Admin only) |
| DELETE | /agents/:id | Delete agent (Admin only) |

## Data Model

Pagination response structure:
```typescript
{
  data: Agent[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }
}
```

## Technical Notes

- Backend pagination is optional - if no query params provided, returns all agents (maintains backward compatibility)
- Frontend uses TanStack Query for data fetching with separate query keys for paginated vs unpaginated
- Edit page fetches full agent data including systemPrompt (not included in list response)
- Status toggle uses optimistic updates via query invalidation

## Dependencies

- Agents CRUD API (existing)
- AddAgentDialog component (existing)
- ConfirmDeleteDialog component (existing)
- TanStack Router for routing
- TanStack Query for data management

## Out of Scope

- Bulk operations (select multiple agents)
- Agent duplication
- Sorting/filtering options
- Search functionality
