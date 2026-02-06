import { Injectable, Logger } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import mammoth from 'mammoth';
import { marked } from 'marked';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../../prisma/prisma.service';
import { DOCUMENTS_BUCKET } from '../../providers/storage/storage.config';
import { StorageService } from '../../providers/storage/storage.service';
import { RagService } from '../rag/rag.service';

@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private rag: RagService,
  ) {}

  async processDocument(documentId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { agent: true },
    });

    if (!document) {
      this.logger.error(`Document ${documentId} not found`);
      return;
    }

    try {
      // Update status to PROCESSING
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      this.logger.log(`Processing document: ${document.title} (${document.filename})`);

      // Get file content from MinIO
      const fileBuffer = await this.storage.getFile(DOCUMENTS_BUCKET, document.minioKey);

      // Parse document based on mime type
      const text = await this.parseDocument(fileBuffer, document.mimeType, document.filename);

      if (!text || text.trim().length === 0) {
        throw new Error('Document is empty or could not be parsed');
      }

      this.logger.log(`Parsed document, text length: ${text.length} characters`);

      // Chunk the text
      const chunks = this.rag.chunkText(text);
      this.logger.log(`Created ${chunks.length} chunks`);

      // Generate embeddings
      const embeddings = await this.rag.generateEmbeddings(chunks);
      this.logger.log(`Generated ${embeddings.length} embeddings`);

      // Store in vector database
      await this.rag.storeChunks(document.agent.slug, chunks, embeddings, {
        documentId: document.id,
        agentId: document.agentId,
        chunkIndex: 0,
        totalChunks: chunks.length,
        filename: document.filename,
        mimeType: document.mimeType,
      });

      // Update document status to COMPLETED
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.COMPLETED,
          chunkCount: chunks.length,
          processedAt: new Date(),
          error: null,
        },
      });

      this.logger.log(
        `Document ${document.title} processed successfully with ${chunks.length} chunks`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process document ${documentId}: ${errorMessage}`);

      // Update document status to FAILED
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          error: errorMessage,
        },
      });
    }
  }

  private async parseDocument(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    switch (mimeType) {
      case 'text/plain':
        return buffer.toString('utf-8');

      case 'text/markdown':
        return this.parseMarkdown(buffer.toString('utf-8'));

      case 'application/pdf':
        return this.parsePdf(buffer);

      case 'text/html':
        return this.parseHtml(buffer.toString('utf-8'));

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.parseDocx(buffer);

      default: {
        // Try to detect by extension
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'md') { return this.parseMarkdown(buffer.toString('utf-8')); }
        if (ext === 'txt') { return buffer.toString('utf-8'); }
        if (ext === 'html' || ext === 'htm') { return this.parseHtml(buffer.toString('utf-8')); }

        throw new Error(`Unsupported mime type: ${mimeType}`);
      }
    }
  }

  private parseMarkdown(content: string): string {
    // Convert markdown to plain text by stripping HTML tags from rendered output
    const html = marked(content) as string;
    return this.stripHtml(html);
  }

  private async parsePdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  }

  private parseHtml(content: string): string {
    return this.stripHtml(content);
  }

  private async parseDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
