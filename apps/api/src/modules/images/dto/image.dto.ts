import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class UploadImageDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Agent ID to associate the image with',
  })
  @IsUUID()
  @IsNotEmpty()
  agentId: string;
}

export class ImageResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  agentId: string;

  @ApiProperty({ example: 'photo.jpg' })
  filename: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ example: 1024000 })
  size: number;

  @ApiPropertyOptional({
    example: {
      subject: 'Mountain landscape',
      setting: 'Outdoor',
      objects: ['mountains', 'trees'],
      colors: ['green', 'blue'],
      text: null,
      mood: 'Serene',
      style: 'Photograph',
    },
  })
  description?: {
    subject: string;
    setting: string;
    objects: string[];
    colors: string[];
    text: string | null;
    mood: string;
    style: string;
  };

  @ApiProperty({ enum: DocumentStatus, example: 'PENDING' })
  status: DocumentStatus;

  @ApiPropertyOptional({ example: 'Failed to process image' })
  error?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  processedAt?: Date;
}

export class ImageWithAgentResponseDto extends ImageResponseDto {
  @ApiProperty({
    example: { id: '123', name: 'General Assistant', slug: 'general-assistant' },
  })
  agent: {
    id: string;
    name: string;
    slug: string;
  };
}

export class GetImagesQueryDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter images by agent ID',
  })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({
    example: 'PENDING',
    description: 'Filter images by status',
    enum: DocumentStatus,
  })
  @IsOptional()
  status?: DocumentStatus;
}
