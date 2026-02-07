import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import type { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RagService))
    private ragService: RagService,
  ) {}

  async findAll() {
    return this.prisma.agent.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllPaginated(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.agent.findMany({
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.agent.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findAllActive() {
    return this.prisma.agent.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  async findBySlug(slug: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { slug },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with slug "${slug}" not found`);
    }

    return agent;
  }

  async create(dto: CreateAgentDto) {
    const existingAgent = await this.prisma.agent.findUnique({
      where: { slug: dto.slug },
    });

    if (existingAgent) {
      throw new ConflictException(`Agent with slug "${dto.slug}" already exists`);
    }

    return this.prisma.agent.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateAgentDto) {
    await this.findById(id);

    return this.prisma.agent.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const agent = await this.findById(id);

    // Delete vector collections for this agent
    await this.ragService.deleteAgentCollections(agent.slug);

    await this.prisma.agent.delete({
      where: { id },
    });

    return { id, deleted: true };
  }
}
