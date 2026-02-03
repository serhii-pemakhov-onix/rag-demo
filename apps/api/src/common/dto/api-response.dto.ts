import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard API response wrapper
 * All successful responses are wrapped in this structure
 */
export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Response payload' })
  data: T;

  @ApiProperty({
    description: 'Response metadata (pagination, etc.)',
    example: {},
    type: 'object',
    additionalProperties: true,
  })
  meta: Record<string, unknown>;
}

/**
 * Standard error response structure
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request', description: 'Error type' })
  error: string;

  @ApiProperty({
    example: 'Validation failed',
    description: 'Error message',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Timestamp of the error',
  })
  timestamp: string;

  @ApiProperty({ example: '/api/auth/login', description: 'Request path' })
  path: string;
}

/**
 * Pagination metadata
 */
export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ example: false, description: 'Has previous page' })
  hasPrevious: boolean;
}

/**
 * Generic paginated response wrapper
 */
export class PaginatedResponseDto<T> {
  data: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/**
 * Simple message response
 */
export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}

/**
 * Delete operation response
 */
export class DeleteResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: true })
  deleted: boolean;
}
