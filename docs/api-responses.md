# API Response Structure

## Overview

All API endpoints follow a consistent response structure. **Every successful response is wrapped in a standard `{ data, meta }` structure.**

## Success Responses

All successful responses follow this format:

```json
{
  "data": <payload>,
  "meta": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | `any` | Response payload (object, array, primitive) |
| `meta` | `object` | Metadata (pagination info, etc.). Always present, may be empty `{}` |

### Single Resource

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "meta": {}
}
```

### Resource with Nested Data

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    }
  },
  "meta": {}
}
```

### List Response

```json
{
  "data": [
    { "id": "1", "title": "Article 1" },
    { "id": "2", "title": "Article 2" }
  ],
  "meta": {}
}
```

### Paginated Response

```json
{
  "data": [
    { "id": "1", "title": "Article 1" },
    { "id": "2", "title": "Article 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Message Response

Used for operations that don't return data (logout, etc.):

```json
{
  "data": {
    "message": "Logged out successfully"
  },
  "meta": {}
}
```

### Delete Response

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deleted": true
  },
  "meta": {}
}
```

## Error Responses

Errors are **not** wrapped in `data`/`meta`. They have a distinct structure:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/auth/login"
}
```

### Error Fields

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | number | HTTP status code |
| `error` | string | Error type/name |
| `message` | string \| string[] | Error details (can be array for validation errors) |
| `timestamp` | string | ISO 8601 timestamp |
| `path` | string | Request path |

### Validation Errors

When validation fails, `message` contains an array of error messages:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/auth/login"
}
```

## HTTP Status Codes

### Success Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |

### Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 422 | Unprocessable Entity | Semantic validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

## Implementation

The response structure is enforced globally by:

- **ResponseInterceptor** (`src/common/interceptors/response.interceptor.ts`) - Wraps all successful responses in `{ data, meta }`
- **HttpExceptionFilter** (`src/common/filters/http-exception.filter.ts`) - Formats all error responses

Registered in `main.ts`:

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
app.useGlobalInterceptors(new ResponseInterceptor());
```

## Response DTOs

Common response DTOs are available in `src/common/dto/`:

```typescript
import {
  ApiResponseDto,
  ErrorResponseDto,
  MessageResponseDto,
  DeleteResponseDto,
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../common/dto';
```

### Usage in Controllers

Controllers return raw data - the interceptor wraps it automatically:

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return this.service.findOne(id);
  // Response: { data: { id, ... }, meta: {} }
}
```

To include custom metadata, return an object with a `meta` property:

```typescript
@Get()
findAll(@Query() query: PaginationDto) {
  const [items, total] = await this.service.findAll(query);
  return {
    ...items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      hasNext: query.page * query.limit < total,
      hasPrevious: query.page > 1,
    },
  };
}
```

## Pagination Query Parameters

For paginated endpoints:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 10 | Items per page (max 100) |
| `sort` | string | - | Sort field (prefix with `-` for desc) |

Example: `GET /api/articles?page=2&limit=20&sort=-createdAt`
