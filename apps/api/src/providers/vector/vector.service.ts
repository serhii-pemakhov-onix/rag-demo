import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudClient, type Metadata } from 'chromadb';

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

  async createCollection(name: string) {
    const collection = await this.client.getOrCreateCollection({ name });
    return collection;
  }

  async addDocuments(
    collectionName: string,
    documents: string[],
    embeddings: number[][],
    metadatas?: Metadata[],
    ids?: string[],
  ) {
    const collection = await this.client.getCollection({ name: collectionName });
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
    const collection = await this.client.getCollection({ name: collectionName });

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
    });

    return results;
  }

  async deleteCollection(name: string) {
    await this.client.deleteCollection({ name });
    return { name, deleted: true };
  }
}
