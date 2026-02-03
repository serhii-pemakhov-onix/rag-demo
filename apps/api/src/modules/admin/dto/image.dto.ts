import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadImageDto {
  @ApiProperty({
    example: 'diagram.png',
    description: 'Image filename',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiPropertyOptional({
    example: 'RAG architecture diagram',
    description: 'Alt text for accessibility',
  })
  @IsString()
  @IsOptional()
  alt?: string;

  @ApiPropertyOptional({
    example: 'Diagram showing the RAG pipeline',
    description: 'Image description',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
