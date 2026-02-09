import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlamaIndexService } from '../../providers/llamaindex/llamaindex.service';
import { OllamaService } from '../../providers/ollama/ollama.service';
import { QdrantService } from '../../providers/qdrant/qdrant.service';
import type { QdrantPoint } from '../../providers/qdrant/qdrant.types';

function toPointId(input: string): string {
  const hex = createHash('md5').update(input).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export interface DocumentMetadata {
  documentId: string;
  agentId: string;
  filename: string;
  mimeType: string;
  type: 'article' | 'image';
  imageId?: string;
  subject?: string;
  style?: string;
}

export interface RetrievalResult {
  content: string;
  score: number;
  metadata: DocumentMetadata;
}

export interface ArticleMetadata {
  documentId: string;
  agentId: string;
  filename: string;
  mimeType: string;
}

export interface ImageMetadata {
  imageId: string;
  agentId: string;
  filename: string;
  mimeType: string;
  description: string;
  subject?: string;
  style?: string;
}

export interface SearchResult {
  articles: RetrievalResult[];
  images: RetrievalResult[];
}

const EMBEDDING_DIMENSION = 768;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  private readonly imageScoreThreshold: number;

  constructor(
    private llamaIndex: LlamaIndexService,
    private ollama: OllamaService,
    private qdrant: QdrantService,
    private configService: ConfigService,
  ) {
    this.imageScoreThreshold = Number.parseFloat(
      this.configService.get<string>('IMAGE_SCORE_THRESHOLD', '0.4'),
    );
  }

  private getArticlesCollection(agentSlug: string): string {
    return `${agentSlug}_articles`;
  }

  private getImagesCollection(agentSlug: string): string {
    return `${agentSlug}_images`;
  }

  async ingestDocument(
    agentSlug: string,
    text: string,
    metadata: ArticleMetadata,
  ): Promise<number> {
    const collection = this.getArticlesCollection(agentSlug);

    const nodes = this.llamaIndex.parseDocument(text);
    this.logger.log(`Parsed document into ${nodes.length} nodes`);

    const points: QdrantPoint[] = await Promise.all(
      nodes.map(async (node, index) => {
        const embedding = await this.llamaIndex.getEmbedding(node.text);
        return {
          id: toPointId(`${metadata.documentId}_node_${index}`),
          vector: embedding,
          payload: {
            ...metadata,
            type: 'article',
            content: node.text,
            nodeIndex: index,
            totalNodes: nodes.length,
          },
        };
      }),
    );

    await this.qdrant.ensureCollection(collection, EMBEDDING_DIMENSION);
    await this.qdrant.upsertPoints(collection, points);

    this.logger.log(`Ingested document ${metadata.documentId} into ${collection}`);
    return points.length;
  }

  async ingestImage(agentSlug: string, metadata: ImageMetadata): Promise<void> {
    const collection = this.getImagesCollection(agentSlug);

    const embedding = await this.llamaIndex.getEmbedding(metadata.description);

    const point: QdrantPoint = {
      id: toPointId(`image_${metadata.imageId}`),
      vector: embedding,
      payload: {
        documentId: metadata.imageId,
        agentId: metadata.agentId,
        filename: metadata.filename,
        mimeType: metadata.mimeType,
        type: 'image',
        imageId: metadata.imageId,
        subject: metadata.subject,
        style: metadata.style,
        content: metadata.description,
      },
    };

    await this.qdrant.ensureCollection(collection, EMBEDDING_DIMENSION);
    await this.qdrant.upsertPoints(collection, [point]);

    this.logger.log(`Ingested image ${metadata.imageId} into ${collection}`);
  }

  async searchSimilar(agentSlug: string, query: string, topK = 5): Promise<SearchResult> {
    const articlesCollection = this.getArticlesCollection(agentSlug);
    const imagesCollection = this.getImagesCollection(agentSlug);

    const [queryEmbedding, translatedQuery] = await Promise.all([
      this.llamaIndex.getEmbedding(query),
      this.ollama.translateToEnglish(query),
    ]);

    this.logger.debug(`Translated image query: "${translatedQuery}"`);

    const imageQueryEmbedding = await this.llamaIndex.getEmbedding(translatedQuery);

    const [articleResults, imageResults] = await Promise.all([
      this.qdrant.search(articlesCollection, queryEmbedding, topK),
      this.qdrant.search(imagesCollection, imageQueryEmbedding, topK, this.imageScoreThreshold),
    ]);

    const mapResult = (result: (typeof articleResults)[number]): RetrievalResult => ({
      content: (result.payload.content as string) || '',
      score: result.score,
      metadata: {
        documentId: result.payload.documentId as string,
        agentId: result.payload.agentId as string,
        filename: result.payload.filename as string,
        mimeType: result.payload.mimeType as string,
        type: result.payload.type as 'article' | 'image',
        imageId: result.payload.imageId as string | undefined,
        subject: result.payload.subject as string | undefined,
        style: result.payload.style as string | undefined,
      },
    });

    const articles = articleResults.map(mapResult);
    const allImages = imageResults.map(mapResult);

    this.logger.log(`Search returned ${articles.length} articles, ${allImages.length} images`);
    this.logger.log(articles.map((item) => item.content).join('\n\n'));

    if (allImages.length > 0) {
      this.logger.debug(
        `Image scores: ${allImages.map((img) => img.score.toFixed(3)).join(', ')} (threshold: ${this.imageScoreThreshold})`,
      );
    }

    const images =
      allImages.length > 1 ? [allImages[Math.floor(Math.random() * allImages.length)]] : allImages;

    return { articles, images };
  }

  async deleteDocument(agentSlug: string, documentId: string): Promise<void> {
    const collection = this.getArticlesCollection(agentSlug);
    await this.qdrant.deleteByFilter(collection, {
      must: [{ key: 'documentId', match: { value: documentId } }],
    });
    this.logger.log(`Deleted document ${documentId} from ${collection}`);
  }

  async deleteImage(agentSlug: string, imageId: string): Promise<void> {
    const collection = this.getImagesCollection(agentSlug);
    await this.qdrant.deleteByFilter(collection, {
      must: [{ key: 'imageId', match: { value: imageId } }],
    });
    this.logger.log(`Deleted image ${imageId} from ${collection}`);
  }

  async deleteAgentCollections(agentSlug: string): Promise<void> {
    const articlesCollection = this.getArticlesCollection(agentSlug);
    const imagesCollection = this.getImagesCollection(agentSlug);

    await Promise.all([
      this.qdrant.deleteCollection(articlesCollection),
      this.qdrant.deleteCollection(imagesCollection),
    ]);

    this.logger.log(`Deleted collections for agent ${agentSlug}`);
  }
}
