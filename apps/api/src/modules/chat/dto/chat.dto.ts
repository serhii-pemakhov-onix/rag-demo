import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({
    example: 'What is RAG?',
    description: 'User message to process',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class ChatSourceDto {
  @ApiProperty({ example: 'article-123' })
  id: string;

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
    type: [ChatSourceDto],
    description: 'Source documents used for the response',
  })
  sources: ChatSourceDto[];
}
