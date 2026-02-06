import { Injectable } from '@nestjs/common';
import { OllamaService } from '../../providers/ollama/ollama.service';
import { VectorService } from '../../providers/vector/vector.service';

export interface ChunkMetadata {
  documentId: string;
  agentId: string;
  chunkIndex: number;
  totalChunks: number;
  filename: string;
  mimeType: string;
}

@Injectable()
export class RagService {
  constructor(
    private ollama: OllamaService,
    private vector: VectorService,
  ) {}

  chunkText(text: string, chunkSize = 512, overlap = 100): string[] {
    const chunks: string[] = [];

    // Clean and normalize text
    const cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleanedText.length <= chunkSize) {
      return [cleanedText];
    }

    // Split by paragraphs first
    const paragraphs = cleanedText.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) { continue; }

      // If adding this paragraph would exceed chunk size
      if (currentChunk.length + trimmedParagraph.length + 2 > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }

        // If paragraph itself is too large, split it further
        if (trimmedParagraph.length > chunkSize) {
          const sentences = this.splitIntoSentences(trimmedParagraph);
          let sentenceChunk = '';

          for (const sentence of sentences) {
            if (sentenceChunk.length + sentence.length + 1 > chunkSize) {
              if (sentenceChunk) {
                chunks.push(sentenceChunk.trim());
              }
              // If sentence is still too long, split by words
              if (sentence.length > chunkSize) {
                const wordChunks = this.splitByWords(sentence, chunkSize);
                chunks.push(...wordChunks);
                sentenceChunk = '';
              } else {
                sentenceChunk = sentence;
              }
            } else {
              sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
            }
          }
          currentChunk = sentenceChunk;
        } else {
          currentChunk = trimmedParagraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Add overlap between chunks
    if (overlap > 0 && chunks.length > 1) {
      return this.addOverlap(chunks, overlap);
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while preserving the delimiter
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  private splitByWords(text: string, maxLength: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const word of words) {
      if (currentChunk.length + word.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private addOverlap(chunks: string[], overlapSize: number): string[] {
    const result: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];

      // Add overlap from previous chunk
      if (i > 0) {
        const prevChunk = chunks[i - 1];
        const overlapText = prevChunk.slice(-overlapSize);
        chunk = `${overlapText}... ${chunk}`;
      }

      result.push(chunk);
    }

    return result;
  }

  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    return this.ollama.generateEmbeddings(chunks);
  }

  async storeChunks(
    agentSlug: string,
    chunks: string[],
    embeddings: number[][],
    metadata: ChunkMetadata,
  ): Promise<{ collection: string; count: number }> {
    const collectionName = `agent_${agentSlug}`;

    // Ensure collection exists
    await this.vector.createCollection(collectionName);

    // Generate IDs and metadata for each chunk
    const ids = chunks.map((_, i) => `${metadata.documentId}_chunk_${i}`);

    const metadatas = chunks.map((_, i) => ({
      documentId: metadata.documentId,
      agentId: metadata.agentId,
      chunkIndex: i,
      totalChunks: chunks.length,
      filename: metadata.filename,
      mimeType: metadata.mimeType,
    }));

    return this.vector.addDocuments(collectionName, chunks, embeddings, metadatas, ids);
  }

  async searchSimilar(
    agentSlug: string,
    query: string,
    topK = 5,
  ): Promise<{ documents: string[]; metadatas: Record<string, unknown>[] }> {
    const collectionName = `agent_${agentSlug}`;
    const queryEmbedding = await this.ollama.generateQueryEmbedding(query);
    const results = await this.vector.query(collectionName, queryEmbedding, topK);

    const documents = (results.documents?.[0] || []).filter((doc): doc is string => doc !== null);

    return {
      documents,
      metadatas: (results.metadatas?.[0] as Record<string, unknown>[]) || [],
    };
  }

  async deleteDocumentChunks(
    agentSlug: string,
    documentId: string,
    chunkCount: number,
  ): Promise<{ deletedCount: number }> {
    const collectionName = `agent_${agentSlug}`;
    const ids = Array.from({ length: chunkCount }, (_, i) => `${documentId}_chunk_${i}`);
    return this.vector.deleteDocuments(collectionName, ids);
  }
}
