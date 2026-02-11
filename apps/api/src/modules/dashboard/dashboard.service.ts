import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AgentContentDto,
  DashboardResponseDto,
  OverviewDto,
  RecentActivityItemDto,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardResponseDto> {
    const [overview, contentPerAgent, recentActivity] = await Promise.all([
      this.getOverview(),
      this.getContentPerAgent(),
      this.getRecentActivity(),
    ]);

    return { overview, contentPerAgent, recentActivity };
  }

  private async getOverview(): Promise<OverviewDto> {
    const [totalAgents, activeAgents, totalDocuments, totalImages, chunkAggregate] =
      await Promise.all([
        this.prisma.agent.count(),
        this.prisma.agent.count({ where: { isActive: true } }),
        this.prisma.document.count(),
        this.prisma.image.count(),
        this.prisma.document.aggregate({ _sum: { chunkCount: true } }),
      ]);

    return {
      totalAgents,
      activeAgents,
      inactiveAgents: totalAgents - activeAgents,
      totalDocuments,
      totalImages,
      totalChunks: chunkAggregate._sum.chunkCount ?? 0,
    };
  }

  private async getContentPerAgent(): Promise<AgentContentDto[]> {
    const agents = await this.prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { documents: true, images: true } },
      },
      orderBy: { name: 'asc' },
    });

    return agents.map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      documentCount: agent._count.documents,
      imageCount: agent._count.images,
    }));
  }

  private async getRecentActivity(): Promise<RecentActivityItemDto[]> {
    const [documents, images] = await Promise.all([
      this.prisma.document.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          agent: { select: { name: true } },
        },
      }),
      this.prisma.image.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          status: true,
          createdAt: true,
          agent: { select: { name: true } },
        },
      }),
    ]);

    const items: RecentActivityItemDto[] = [
      ...documents.map((doc) => ({
        id: doc.id,
        type: 'document' as const,
        name: doc.title,
        agentName: doc.agent.name,
        status: doc.status,
        createdAt: doc.createdAt,
      })),
      ...images.map((img) => ({
        id: img.id,
        type: 'image' as const,
        name: img.filename,
        agentName: img.agent.name,
        status: img.status,
        createdAt: img.createdAt,
      })),
    ];

    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10);
  }
}
