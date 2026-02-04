import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateAgentDto {
  @ApiProperty({ example: 'Customer Support Agent' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'customer-support' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens (e.g., my-agent-name)',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'Handles customer inquiries and support tickets' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'You are a helpful customer support agent...' })
  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @ApiPropertyOptional({ example: 'Focus on technical diagrams and extract all visible labels.' })
  @IsString()
  @IsOptional()
  visionPromptInstruction?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAgentDto {
  @ApiPropertyOptional({ example: 'Customer Support Agent' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Handles customer inquiries and support tickets' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'You are a helpful customer support agent...' })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiPropertyOptional({ example: 'Focus on technical diagrams and extract all visible labels.' })
  @IsString()
  @IsOptional()
  visionPromptInstruction?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AgentResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Customer Support Agent' })
  name: string;

  @ApiProperty({ example: 'customer-support' })
  slug: string;

  @ApiPropertyOptional({ example: 'Handles customer inquiries' })
  description?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class AgentWithSystemPromptDto extends AgentResponseDto {
  @ApiProperty({ example: 'You are a helpful assistant...' })
  systemPrompt: string;

  @ApiPropertyOptional({ example: 'Focus on technical diagrams and extract all visible labels.' })
  visionPromptInstruction?: string;
}

export class AgentQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrevious: boolean;
}

export class PaginatedAgentsResponseDto {
  @ApiProperty({ type: [AgentResponseDto] })
  data: AgentResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
