import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({
    example: 'Introduction to RAG',
    description: 'Article title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'RAG (Retrieval-Augmented Generation) is a technique...',
    description: 'Article content',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    example: 'A brief introduction to RAG concepts',
    description: 'Short description of the article',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateArticleDto {
  @ApiPropertyOptional({
    example: 'Updated: Introduction to RAG',
    description: 'Article title',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated content...',
    description: 'Article content',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    example: 'Updated description',
    description: 'Short description of the article',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
