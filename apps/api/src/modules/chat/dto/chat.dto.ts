import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ChatHistoryMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'What is RAG?' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({
    example: 'What is RAG?',
    description: 'User message to process',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Agent ID to use for the chat',
  })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({
    type: [ChatHistoryMessageDto],
    description: 'Previous conversation messages',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  history?: ChatHistoryMessageDto[];
}

export class ChatImageDto {
  @ApiProperty({ example: 'image-uuid' })
  id: string;

  @ApiProperty({ example: '/api/images/image-uuid/file' })
  url: string;

  @ApiProperty({ example: 'photo.jpg' })
  filename: string;

  @ApiProperty({ example: 'A golden retriever in a park' })
  description: string;
}

export class ChatSourceDto {
  @ApiProperty({ example: 'doc-uuid' })
  id: string;

  @ApiProperty({ enum: ['document', 'image'] })
  type: 'document' | 'image';

  @ApiProperty({ example: 'Introduction to RAG' })
  title: string;

  @ApiProperty({ example: 0.95 })
  score: number;
}

export class ChatResponseDto {
  @ApiProperty({
    example: 'RAG stands for Retrieval-Augmented Generation...',
    description: 'AI-generated response',
  })
  response: string;

  @ApiProperty({
    type: [ChatImageDto],
    description: 'Images relevant to the response',
  })
  images: ChatImageDto[];

  @ApiProperty({
    type: [ChatSourceDto],
    description: 'Source documents and images used for the response',
  })
  sources: ChatSourceDto[];
}
