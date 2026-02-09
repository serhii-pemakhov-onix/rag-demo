import { OllamaEmbedding } from '@llamaindex/ollama';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document, TextNode, TokenTextSplitter } from 'llamaindex';

export interface ParsedNode {
  text: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class LlamaIndexService implements OnModuleInit {
  private readonly logger = new Logger(LlamaIndexService.name);
  private embedModel: OllamaEmbedding;
  private nodeParser: TokenTextSplitter;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const ollamaHost = this.configService.get<string>('OLLAMA_HOST', 'localhost');
    const ollamaPort = this.configService.get<number>('OLLAMA_PORT', 11434);
    const ollamaBaseUrl = `http://${ollamaHost}:${ollamaPort}`;

    const embeddingModel = this.configService.get<string>(
      'OLLAMA_EMBEDDING_MODEL',
      'nomic-embed-text',
    );

    this.embedModel = new OllamaEmbedding({
      model: embeddingModel,
      config: { host: ollamaBaseUrl },
    });

    this.nodeParser = new TokenTextSplitter({
      chunkSize: 250,
      chunkOverlap: 20,
    });

    this.logger.log(`LlamaIndex configured with Ollama at ${ollamaBaseUrl}`);
    this.logger.log(`Embedding model: ${embeddingModel}`);
  }

  async getEmbedding(text: string): Promise<number[]> {
    return await this.embedModel.getTextEmbedding(text);
  }

  parseDocument(text: string): ParsedNode[] {
    const document = new Document({ text });
    const nodes = this.nodeParser.getNodesFromDocuments([document]);

    return nodes.map((node) => ({
      text: node instanceof TextNode ? node.text : String(node),
      metadata: node instanceof TextNode ? (node.metadata as Record<string, unknown>) : {},
    }));
  }
}
