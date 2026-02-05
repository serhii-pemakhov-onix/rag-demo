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
      const visionResult = await this.ollama.generateImageDescription(
        fileBuffer,
        image.agent.visionPromptInstruction ?? undefined,
      );

      const { embeddingText, structured, rawResponse } = visionResult;
      this.logger.log(
        `Generated description: ${structured ? `structured (${structured.subject})` : 'raw text'}`,
      );
      this.logger.log(`Embedding text (first 200 chars): ${embeddingText.substring(0, 200)}...`);

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
            subject: structured?.subject ?? 'Custom description',
            style: structured?.style ?? 'Custom',
            type: 'image',
          },
        ],
        [`image_${image.id}`],
      );

      // Store description - either structured JSON or raw text
      const descriptionToStore = structured ?? { rawText: rawResponse };

      // Update image status to COMPLETED
      await this.prisma.image.update({
        where: { id: imageId },
        data: {
          status: DocumentStatus.COMPLETED,
          description: descriptionToStore as object,
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
