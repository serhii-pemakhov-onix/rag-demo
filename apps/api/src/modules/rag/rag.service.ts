import { Injectable, Logger } from '@nestjs/common';
import { LlamaIndexService } from '../../providers/llamaindex/llamaindex.service';
import { OllamaService } from '../../providers/ollama/ollama.service';
import { QdrantService } from '../../providers/qdrant/qdrant.service';

export interface ArticleChunkMetadata {
  documentId: string;
  agentId: string;
  chunkIndex: number;
  totalChunks: number;
  filename: string;
  mimeType: string;
  content: string;
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
  articles: Array<{
    id: string;
    score: number;
    content: string;
    metadata: Omit<ArticleChunkMetadata, 'content'>;
  }>;
  images: Array<{
    id: string;
    score: number;
    description: string;
    metadata: Omit<ImageMetadata, 'description'>;
  }>;
}

// Embedding dimension for nomic-embed-text model
const EMBEDDING_DIMENSION = 768;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private ollama: OllamaService,
    private qdrant: QdrantService,
    private llamaIndex: LlamaIndexService,
  ) {}

  private getArticlesCollection(agentSlug: string): string {
    return `${agentSlug}_articles`;
  }

  private getImagesCollection(agentSlug: string): string {
    return `${agentSlug}_images`;
  }

  chunkText(text: string, chunkSize = 512, overlap = 100): string[] {
    return this.llamaIndex.chunkText(text, chunkSize, overlap);
  }

  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    return this.ollama.generateEmbeddings(chunks);
  }

  async storeArticleChunks(
    agentSlug: string,
    chunks: string[],
    embeddings: number[][],
    metadata: Omit<ArticleChunkMetadata, 'chunkIndex' | 'totalChunks' | 'content'>,
  ): Promise<{ collection: string; count: number }> {
    const collection = this.getArticlesCollection(agentSlug);

    await this.qdrant.ensureCollection(collection, EMBEDDING_DIMENSION);

    const points = chunks.map((chunk, i) => ({
      id: `${metadata.documentId}_chunk_${i}`,
      vector: embeddings[i],
      payload: {
        documentId: metadata.documentId,
        agentId: metadata.agentId,
        chunkIndex: i,
        totalChunks: chunks.length,
        filename: metadata.filename,
        mimeType: metadata.mimeType,
        content: chunk,
      },
    }));

    await this.qdrant.upsertPoints(collection, points);

    this.logger.log(`Stored ${chunks.length} chunks in ${collection}`);
    return { collection, count: chunks.length };
  }

  async storeImageEmbedding(
    agentSlug: string,
    embedding: number[],
    metadata: ImageMetadata,
  ): Promise<{ collection: string; count: number }> {
    const collection = this.getImagesCollection(agentSlug);

    await this.qdrant.ensureCollection(collection, EMBEDDING_DIMENSION);

    const point = {
      id: `image_${metadata.imageId}`,
      vector: embedding,
      payload: {
        imageId: metadata.imageId,
        agentId: metadata.agentId,
        filename: metadata.filename,
        mimeType: metadata.mimeType,
        description: metadata.description,
        subject: metadata.subject,
        style: metadata.style,
      },
    };

    await this.qdrant.upsertPoints(collection, [point]);

    this.logger.log(`Stored image embedding in ${collection}`);
    return { collection, count: 1 };
  }

  async searchSimilar(agentSlug: string, query: string, topK = 5): Promise<SearchResult> {
    const queryEmbedding = await this.ollama.generateQueryEmbedding(query);

    const articlesCollection = this.getArticlesCollection(agentSlug);
    const imagesCollection = this.getImagesCollection(agentSlug);

    // Parallel search in both collections
    const [articleResults, imageResults] = await Promise.all([
      this.qdrant.search(articlesCollection, queryEmbedding, topK),
      this.qdrant.search(imagesCollection, queryEmbedding, topK),
    ]);

    const articles = articleResults.map((r) => ({
      id: r.id,
      score: r.score,
      content: (r.payload.content as string) || '',
      metadata: {
        documentId: r.payload.documentId as string,
        agentId: r.payload.agentId as string,
        chunkIndex: r.payload.chunkIndex as number,
        totalChunks: r.payload.totalChunks as number,
        filename: r.payload.filename as string,
        mimeType: r.payload.mimeType as string,
      },
    }));

    const images = imageResults.map((r) => ({
      id: r.id,
      score: r.score,
      description: (r.payload.description as string) || '',
      metadata: {
        imageId: r.payload.imageId as string,
        agentId: r.payload.agentId as string,
        filename: r.payload.filename as string,
        mimeType: r.payload.mimeType as string,
        subject: r.payload.subject as string | undefined,
        style: r.payload.style as string | undefined,
      },
    }));

    this.logger.log(`Search returned ${articles.length} articles, ${images.length} images`);

    return { articles, images };
  }

  async deleteDocumentChunks(
    agentSlug: string,
    documentId: string,
    chunkCount: number,
  ): Promise<void> {
    const collection = this.getArticlesCollection(agentSlug);
    const ids = Array.from({ length: chunkCount }, (_, i) => `${documentId}_chunk_${i}`);
    await this.qdrant.deletePoints(collection, ids);
    this.logger.log(`Deleted ${chunkCount} chunks for document ${documentId}`);
  }

  async deleteImageEmbedding(agentSlug: string, imageId: string): Promise<void> {
    const collection = this.getImagesCollection(agentSlug);
    await this.qdrant.deletePoints(collection, [`image_${imageId}`]);
    this.logger.log(`Deleted image embedding for ${imageId}`);
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
