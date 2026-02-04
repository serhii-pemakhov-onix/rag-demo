import { Injectable, Logger } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OllamaService } from '../../providers/ollama/ollama.service';
import { IMAGES_BUCKET } from '../../providers/storage/storage.config';
import { StorageService } from '../../providers/storage/storage.service';
import { VectorService } from '../../providers/vector/vector.service';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private ollama: OllamaService,
    private vector: VectorService,
  ) {}

  async processImage(imageId: string): Promise<void> {
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: { agent: true },
    });

    if (!image) {
      this.logger.error(`Image ${imageId} not found`);
      return;
    }

    try {
      // Update status to PROCESSING
      await this.prisma.image.update({
        where: { id: imageId },
        data: { status: DocumentStatus.PROCESSING },
      });

      this.logger.log(`Processing image: ${image.filename}`);

      // Get file content from MinIO
      const fileBuffer = await this.storage.getFile(IMAGES_BUCKET, image.minioKey);

      // Generate description using vision model
      const description = await this.ollama.generateImageDescription(
        fileBuffer,
        image.agent.visionPromptInstruction ?? undefined,
      );
      this.logger.log(`Generated description for image: ${description.subject}`);

      // Convert description to embedding text
      const embeddingText = this.ollama.descriptionToEmbeddingText(description);
      this.logger.log(`Embedding text: ${embeddingText}`);

      // Generate embedding
      const embedding = await this.ollama.generateEmbedding(embeddingText);
      this.logger.log(`Generated embedding with ${embedding.length} dimensions`);

      // Store in vector database
      const collectionName = `agent_${image.agent.slug}`;
      await this.vector.createCollection(collectionName);

      await this.vector.addDocuments(
        collectionName,
        [embeddingText],
        [embedding],
        [
          {
            imageId: image.id,
            agentId: image.agentId,
            filename: image.filename,
            mimeType: image.mimeType,
            subject: description.subject,
            style: description.style,
            type: 'image',
          },
        ],
        [`image_${image.id}`],
      );

      // Update image status to COMPLETED
      await this.prisma.image.update({
        where: { id: imageId },
        data: {
          status: DocumentStatus.COMPLETED,
          description: description as unknown as object,
          processedAt: new Date(),
          error: null,
        },
      });

      this.logger.log(`Image ${image.filename} processed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process image ${imageId}: ${errorMessage}`);

      // Update image status to FAILED
      await this.prisma.image.update({
        where: { id: imageId },
        data: {
          status: DocumentStatus.FAILED,
          error: errorMessage,
        },
      });
    }
  }
}
