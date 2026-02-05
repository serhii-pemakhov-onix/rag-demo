import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudClient, type Collection, type Metadata, type EmbeddingFunction } from 'chromadb';

// No-op embedding function since we provide embeddings directly from Ollama
const noopEmbeddingFunction: EmbeddingFunction = {
  generate: async () => [],
};

/**
 * Suppress the chromadb 3.x "No embedding function configuration found for
 * collection schema deserialization" console.warn that fires every time
 * getCollection / getOrCreateCollection is called on a collection created
 * without a server-side embedding-function config.  The warning is harmless
 * because we always supply embeddings directly from Ollama.
 */
async function suppressEfWarning<T>(fn: () => Promise<T>): Promise<T> {
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('No embedding function configuration found')
    ) {
      return; // swallow
    }
    origWarn.apply(console, args);
  };
  try {
    return await fn();
  } finally {
    console.warn = origWarn;
  }
}

@Injectable()
export class VectorService implements OnModuleInit {
  private client: CloudClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new CloudClient({
      apiKey: this.configService.get<string>('CHROMA_API_KEY'),
      tenant: this.configService.get<string>('CHROMA_TENANT'),
      database: this.configService.get<string>('CHROMA_DATABASE'),
    });
  }

  private getCollection(name: string): Promise<Collection> {
    return suppressEfWarning(() =>
      this.client.getCollection({ name, embeddingFunction: noopEmbeddingFunction }),
    );
  }

  async createCollection(name: string) {
    return suppressEfWarning(() =>
      this.client.getOrCreateCollection({ name, embeddingFunction: noopEmbeddingFunction }),
    );
  }

  async addDocuments(
    collectionName: string,
    documents: string[],
    embeddings: number[][],
    metadatas?: Metadata[],
    ids?: string[],
  ) {
    const collection = await this.getCollection(collectionName);
    const documentIds = ids || documents.map((_, i) => `doc_${Date.now()}_${i}`);

    await collection.add({
      ids: documentIds,
      documents,
      embeddings,
      metadatas,
    });

    return { collection: collectionName, count: documents.length };
  }

  async query(collectionName: string, embedding: number[], topK = 5) {
    const collection = await this.getCollection(collectionName);

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
    });

    return results;
  }

  async deleteDocuments(collectionName: string, ids: string[]) {
    try {
      const collection = await this.getCollection(collectionName);
      await collection.delete({ ids });
      return { collection: collectionName, deletedCount: ids.length };
    } catch {
      // Collection might not exist if image was never processed
      return { collection: collectionName, deletedCount: 0 };
    }
  }

  async deleteCollection(name: string) {
    await this.client.deleteCollection({ name });
    return { name, deleted: true };
  }
}
