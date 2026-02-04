import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    example: 'Introduction to RAG',
    description: 'Document title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Agent ID to associate the document with',
  })
  @IsUUID()
  @IsNotEmpty()
  agentId: string;
}

export class DocumentResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  agentId: string;

  @ApiProperty({ example: 'Introduction to RAG' })
  title: string;

  @ApiProperty({ example: 'document.pdf' })
  filename: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 1024000 })
  size: number;

  @ApiProperty({ enum: DocumentStatus, example: 'PENDING' })
  status: DocumentStatus;

  @ApiPropertyOptional({ example: 10 })
  chunkCount?: number;

  @ApiPropertyOptional({ example: 'Failed to process document' })
  error?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  processedAt?: Date;
}

export class DocumentWithAgentResponseDto extends DocumentResponseDto {
  @ApiProperty({
    example: { id: '123', name: 'General Assistant', slug: 'general-assistant' },
  })
  agent: {
    id: string;
    name: string;
    slug: string;
  };
}

export class GetDocumentsQueryDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter documents by agent ID',
  })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({
    example: 'PENDING',
    description: 'Filter documents by status',
    enum: DocumentStatus,
  })
  @IsOptional()
  status?: DocumentStatus;
}
