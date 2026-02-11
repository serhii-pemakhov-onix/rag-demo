import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { DOCUMENTS_BUCKET } from '../../providers/storage/storage.config';
import { StorageService } from '../../providers/storage/storage.service';
import { AgentsService } from '../agents/agents.service';
import { RagService } from '../rag/rag.service';
import { DocumentProcessingService } from './document-processing.service';
import type { GetDocumentsQueryDto, UploadDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private agentsService: AgentsService,
    private processingService: DocumentProcessingService,
    private ragService: RagService,
  ) {}

  async findAll(query?: GetDocumentsQueryDto) {
    const where = this.buildWhereFilter(query);

    return this.prisma.document.findMany({
      where,
      include: { agent: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPaginated(query: GetDocumentsQueryDto) {
    const where = this.buildWhereFilter(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: { agent: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
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

  private buildWhereFilter(query?: GetDocumentsQueryDto) {
    const where: { agentId?: string; status?: DocumentStatus } = {};

    if (query?.agentId) {
      where.agentId = query.agentId;
    }
    if (query?.status) {
      where.status = query.status;
    }

    return where;
  }

  async findById(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async findByAgentId(agentId: string) {
    return this.prisma.document.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(file: Express.Multer.File, dto: UploadDocumentDto) {
    // Verify agent exists
    await this.agentsService.findById(dto.agentId);

    const documentId = uuidv4();
    const minioKey = `${dto.agentId}/${documentId}/${file.originalname}`;

    await this.storage.uploadFile(DOCUMENTS_BUCKET, minioKey, file.buffer, {
      'Content-Type': file.mimetype,
      'X-Document-Title': dto.title,
    });

    const document = await this.prisma.document.create({
      data: {
        id: documentId,
        agentId: dto.agentId,
        title: dto.title,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        minioKey,
      },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });

    // Start processing immediately (async, don't await)
    this.processDocumentAsync(documentId);

    return document;
  }

  private processDocumentAsync(documentId: string): void {
    // Process document in background without blocking the response
    this.processingService.processDocument(documentId).catch((error) => {
      this.logger.error(`Background processing failed for document ${documentId}:`, error);
    });
  }

  async delete(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { agent: { select: { slug: true } } },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Delete from MinIO
    await this.storage.deleteFile(DOCUMENTS_BUCKET, document.minioKey);

    // Delete from vector database
    await this.ragService.deleteDocument(document.agent.slug, document.id);
    this.logger.log(`Deleted document from vector database`);

    // Delete from PostgreSQL
    await this.prisma.document.delete({
      where: { id },
    });

    return { id, deleted: true };
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
    options?: { chunkCount?: number; error?: string },
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        status,
        chunkCount: options?.chunkCount,
        error: options?.error,
        processedAt: status === DocumentStatus.COMPLETED ? new Date() : undefined,
      },
    });
  }

  async getFileContent(id: string): Promise<Buffer> {
    const document = await this.findById(id);
    return this.storage.getFile(DOCUMENTS_BUCKET, document.minioKey);
  }
}
