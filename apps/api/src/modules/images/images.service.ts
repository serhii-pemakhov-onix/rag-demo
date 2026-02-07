import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { IMAGES_BUCKET } from '../../providers/storage/storage.config';
import { StorageService } from '../../providers/storage/storage.service';
import { AgentsService } from '../agents/agents.service';
import { RagService } from '../rag/rag.service';
import type { GetImagesQueryDto, UploadImageDto } from './dto/image.dto';
import { ImageProcessingService } from './image-processing.service';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private ragService: RagService,
    private agentsService: AgentsService,
    private processingService: ImageProcessingService,
  ) {}

  async findAll(query?: GetImagesQueryDto) {
    const where: { agentId?: string; status?: DocumentStatus } = {};

    if (query?.agentId) {
      where.agentId = query.agentId;
    }
    if (query?.status) {
      where.status = query.status;
    }

    return this.prisma.image.findMany({
      where,
      include: { agent: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const image = await this.prisma.image.findUnique({
      where: { id },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return image;
  }

  async findByAgentId(agentId: string) {
    return this.prisma.image.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(file: Express.Multer.File, dto: UploadImageDto) {
    // Verify agent exists
    await this.agentsService.findById(dto.agentId);

    const imageId = uuidv4();
    const minioKey = `${dto.agentId}/${imageId}/${file.originalname}`;

    await this.storage.uploadFile(IMAGES_BUCKET, minioKey, file.buffer, {
      'Content-Type': file.mimetype,
    });

    const image = await this.prisma.image.create({
      data: {
        id: imageId,
        agentId: dto.agentId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        minioKey,
      },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });

    // Start processing immediately (async, don't await)
    this.processImageAsync(imageId);

    return image;
  }

  private processImageAsync(imageId: string): void {
    // Process image in background without blocking the response
    this.processingService.processImage(imageId).catch((error) => {
      this.logger.error(`Background processing failed for image ${imageId}:`, error);
    });
  }

  async delete(id: string) {
    const image = await this.prisma.image.findUnique({
      where: { id },
      include: { agent: { select: { slug: true } } },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    // Delete from MinIO
    await this.storage.deleteFile(IMAGES_BUCKET, image.minioKey);

    // Delete from vector database
    await this.ragService.deleteImageEmbedding(image.agent.slug, id);

    // Delete from PostgreSQL
    await this.prisma.image.delete({
      where: { id },
    });

    return { id, deleted: true };
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
    options?: { description?: Prisma.InputJsonValue; error?: string },
  ) {
    const image = await this.prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return this.prisma.image.update({
      where: { id },
      data: {
        status,
        description: options?.description,
        error: options?.error,
        processedAt: status === DocumentStatus.COMPLETED ? new Date() : undefined,
      },
    });
  }

  async getFileContent(id: string): Promise<Buffer> {
    const image = await this.findById(id);
    return this.storage.getFile(IMAGES_BUCKET, image.minioKey);
  }
}
