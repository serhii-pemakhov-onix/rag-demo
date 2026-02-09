import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { QdrantFilter, QdrantPoint, QdrantSearchResult } from './qdrant.types';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const qdrantUrl = this.configService.get<string>('QDRANT_URL', 'http://localhost:6333');
    this.client = new QdrantClient({ url: qdrantUrl });
    this.logger.log(`Qdrant client initialized at ${qdrantUrl}`);
  }

  async ensureCollection(name: string, dimension: number): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === name);

    if (!exists) {
      await this.client.createCollection(name, {
        vectors: { size: dimension, distance: 'Cosine' },
      });
      this.logger.log(`Created collection: ${name}`);
    }
  }

  async deleteCollection(name: string): Promise<void> {
    try {
      await this.client.deleteCollection(name);
      this.logger.log(`Deleted collection: ${name}`);
    } catch (error) {
      this.logger.debug(`Delete collection failed for ${name}: ${error}`);
    }
  }

  async upsertPoints(collection: string, points: QdrantPoint[]): Promise<void> {
    await this.client.upsert(collection, { wait: true, points });
    this.logger.log(`Upserted ${points.length} points in ${collection}`);
  }

  async deleteByFilter(collection: string, filter: QdrantFilter): Promise<void> {
    try {
      await this.client.delete(collection, { filter });
      this.logger.log(`Deleted points from ${collection} with filter`);
    } catch (error) {
      this.logger.debug(`Delete failed for ${collection}: ${error}`);
    }
  }

  async search(
    collection: string,
    vector: number[],
    topK: number,
    scoreThreshold?: number,
  ): Promise<QdrantSearchResult[]> {
    try {
      const results = await this.client.search(collection, {
        vector,
        limit: topK,
        with_payload: true,
        score_threshold: scoreThreshold,
      });

      return results.map((result) => ({
        id: result.id,
        score: result.score,
        payload: (result.payload as Record<string, unknown>) ?? {},
      }));
    } catch (error) {
      this.logger.debug(`Search failed for ${collection}: ${error}`);
      return [];
    }
  }
}
