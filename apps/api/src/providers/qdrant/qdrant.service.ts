import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { QdrantPoint, QdrantSearchResult } from './qdrant.types';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('QDRANT_URL', 'http://localhost:6333');
    this.client = new QdrantClient({ url });
    this.logger.log(`Qdrant client initialized with URL: ${url}`);
  }

  async ensureCollection(name: string, dimension: number): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === name);

    if (!exists) {
      await this.client.createCollection(name, {
        vectors: {
          size: dimension,
          distance: 'Cosine',
        },
      });
      this.logger.log(`Created collection: ${name} (dimension: ${dimension})`);
    }
  }

  async deleteCollection(name: string): Promise<void> {
    try {
      await this.client.deleteCollection(name);
      this.logger.log(`Deleted collection: ${name}`);
    } catch {
      // Collection might not exist
      this.logger.debug(`Collection ${name} not found or already deleted`);
    }
  }

  async upsertPoints(collection: string, points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    await this.client.upsert(collection, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });

    this.logger.debug(`Upserted ${points.length} points to collection: ${collection}`);
  }

  async deletePoints(collection: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    try {
      await this.client.delete(collection, {
        wait: true,
        points: ids,
      });
      this.logger.debug(`Deleted ${ids.length} points from collection: ${collection}`);
    } catch (error) {
      // Collection or points might not exist
      this.logger.debug(`Failed to delete points from ${collection}: ${error}`);
    }
  }

  async search(collection: string, vector: number[], topK: number): Promise<QdrantSearchResult[]> {
    try {
      const results = await this.client.search(collection, {
        vector,
        limit: topK,
        with_payload: true,
      });

      return results.map((r) => ({
        id: typeof r.id === 'string' ? r.id : String(r.id),
        score: r.score,
        payload: (r.payload as Record<string, unknown>) || {},
      }));
    } catch (error) {
      // Collection might not exist yet
      this.logger.debug(`Search failed for collection ${collection}: ${error}`);
      return [];
    }
  }
}
