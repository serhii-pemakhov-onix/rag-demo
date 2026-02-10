import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';

export class OverviewDto {
  @ApiProperty({ example: 3 })
  totalAgents: number;

  @ApiProperty({ example: 2 })
  activeAgents: number;

  @ApiProperty({ example: 1 })
  inactiveAgents: number;

  @ApiProperty({ example: 15 })
  totalDocuments: number;

  @ApiProperty({ example: 8 })
  totalImages: number;

  @ApiProperty({ example: 120 })
  totalChunks: number;
}

export class AgentContentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  agentId: string;

  @ApiProperty({ example: 'General Assistant' })
  agentName: string;

  @ApiProperty({ example: 5 })
  documentCount: number;

  @ApiProperty({ example: 3 })
  imageCount: number;
}

export class RecentActivityItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ enum: ['document', 'image'], example: 'document' })
  type: 'document' | 'image';

  @ApiProperty({ example: 'Introduction to RAG' })
  name: string;

  @ApiProperty({ example: 'General Assistant' })
  agentName: string;

  @ApiProperty({ enum: DocumentStatus, example: 'COMPLETED' })
  status: DocumentStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class DashboardResponseDto {
  @ApiProperty({ type: OverviewDto })
  overview: OverviewDto;

  @ApiProperty({ type: [AgentContentDto] })
  contentPerAgent: AgentContentDto[];

  @ApiProperty({ type: [RecentActivityItemDto] })
  recentActivity: RecentActivityItemDto[];
}
