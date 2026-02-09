import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OllamaService } from '../../providers/ollama/ollama.service';
import { AgentsService } from '../agents/agents.service';
import { RagService } from '../rag/rag.service';
import type { ChatImageDto, ChatRequestDto, ChatResponseDto, ChatSourceDto } from './dto/chat.dto';

const MAX_HISTORY_MESSAGES = 20;

export type StreamEvent =
  | { event: 'sources'; data: { images: ChatImageDto[]; sources: ChatSourceDto[] } }
  | { event: 'token'; data: { content: string } }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: { message: string } };

interface PreparedChat {
  messages: { role: string; content: string }[];
  images: ChatImageDto[];
  sources: ChatSourceDto[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private ragService: RagService,
    private agentsService: AgentsService,
    private ollamaService: OllamaService,
    private prisma: PrismaService,
  ) {}

  private async prepareChat(dto: ChatRequestDto): Promise<PreparedChat> {
    this.logger.log(
      `prepareChat called: agentId=${dto.agentId}, message="${dto.message}", historyLength=${dto.history?.length ?? 0}`,
    );

    // 1. Validate agent
    let agent: Awaited<ReturnType<typeof this.agentsService.findById>>;
    try {
      agent = await this.agentsService.findById(dto.agentId);
      this.logger.log(
        `Agent found: name="${agent.name}", slug="${agent.slug}", isActive=${agent.isActive}`,
      );
    } catch (error) {
      this.logger.error(`Agent lookup failed: ${error}`);
      throw error;
    }

    if (!agent.isActive) {
      throw new BadRequestException('Agent is not active');
    }

    // 2. Search for relevant context (parallel search for articles and images)
    const documentContextParts: string[] = [];
    const imageContextParts: string[] = [];
    const images: ChatImageDto[] = [];
    const sources: ChatSourceDto[] = [];
    const seenDocumentIds = new Set<string>();
    const seenImageIds = new Set<string>();

    try {
      this.logger.log(`Searching for agent slug="${agent.slug}"...`);
      const { articles, images: imageResults } = await this.ragService.searchSimilar(
        agent.slug,
        dto.message,
      );
      this.logger.log(`Search returned ${articles.length} articles, ${imageResults.length} images`);

      // Process articles
      for (const article of articles) {
        const { metadata, content, score } = article;

        // Add chunk text to context
        if (content) {
          documentContextParts.push(
            `[${documentContextParts.length + imageContextParts.length + 1}] (source: ${metadata.filename})\n${content}`,
          );
        }

        // Deduplicate sources by documentId
        if (!seenDocumentIds.has(metadata.documentId)) {
          seenDocumentIds.add(metadata.documentId);

          try {
            const doc = await this.prisma.document.findUnique({
              where: { id: metadata.documentId },
            });
            if (doc) {
              sources.push({
                id: metadata.documentId,
                type: 'document',
                title: doc.title,
                score,
              });
            }
          } catch (error) {
            this.logger.warn(`Failed to resolve document ${metadata.documentId}: ${error}`);
          }
        }
      }

      // Process images
      for (const imageResult of imageResults) {
        const { metadata, content, score } = imageResult;
        const imageId = metadata.imageId;

        if (!imageId || seenImageIds.has(imageId)) {
          continue;
        }
        seenImageIds.add(imageId);

        try {
          const image = await this.prisma.image.findUnique({ where: { id: imageId } });
          if (image) {
            const url = `/api/images/${imageId}/file`;

            images.push({
              id: imageId,
              url,
              filename: image.filename,
              description: content || metadata.subject || image.filename,
            });

            sources.push({
              id: imageId,
              type: 'image',
              title: image.filename,
              score,
            });

            imageContextParts.push(
              `[${documentContextParts.length + imageContextParts.length + 1}] (source: ${image.filename})\n${content}`,
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to resolve image ${imageId}: ${error}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Vector search failed, proceeding without context: ${error}`);
    }

    this.logger.log(
      `Context built: ${documentContextParts.length} doc chunks, ${imageContextParts.length} image parts, ${images.length} images, ${sources.length} sources`,
    );

    // 3. Build LLM messages
    const messages: { role: string; content: string }[] = [];

    // System prompt
    messages.push({ role: 'system', content: agent.systemPrompt });

    // Context message
    const contextParts: string[] = [];
    if (documentContextParts.length > 0 || imageContextParts.length > 0) {
      contextParts.push(
        "Use the following context to answer the user's question. If the context doesn't contain relevant information, say so honestly.\n" +
          'IMPORTANT: Always respond in the same language the user is writing in, regardless of the language of the context below.',
      );

      if (documentContextParts.length > 0) {
        contextParts.push('--- Document Context ---');
        contextParts.push(documentContextParts.join('\n\n'));
      }

      if (imageContextParts.length > 0) {
        contextParts.push(
          '--- Image Context ---\n' +
            'IMPORTANT: The following images have ALREADY been displayed to the user above your text response. ' +
            'Do NOT say you cannot show images. Instead, refer to them naturally (e.g. "As shown in the image above...").\n\n' +
            imageContextParts.join('\n\n'),
        );
      }

      messages.push({ role: 'system', content: contextParts.join('\n\n') });
    }

    // Conversation history (last N messages)
    if (dto.history && dto.history.length > 0) {
      const trimmedHistory = dto.history.slice(-MAX_HISTORY_MESSAGES);
      for (const msg of trimmedHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Current user message
    if (images.length > 0) {
      messages.push({
        role: 'user',
        content:
          `${dto.message}\n\n` +
          '[Note: A relevant image is already displayed in the chat UI. ' +
          'Do not say you cannot display or show images. Describe what the image depicts based on the image context provided.]',
      });
    } else {
      messages.push({ role: 'user', content: dto.message });
    }

    this.logger.log(
      `Prepared ${messages.length} messages (roles: ${messages.map((m) => m.role).join(', ')})`,
    );

    return { messages, images, sources };
  }

  async processMessage(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const { messages, images, sources } = await this.prepareChat(dto);

    this.logger.log(`Calling Ollama chat with ${messages.length} messages`);

    try {
      const llmResult = await this.ollamaService.chat(messages);
      this.logger.log(`Ollama response received: ${llmResult.response.substring(0, 100)}...`);

      return {
        response: llmResult.response,
        images,
        sources,
      };
    } catch (error) {
      this.logger.error(`Ollama chat failed: ${error}`);
      throw error;
    }
  }

  async *processMessageStream(dto: ChatRequestDto): AsyncGenerator<StreamEvent> {
    let prepared: PreparedChat;

    try {
      prepared = await this.prepareChat(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      yield { event: 'error', data: { message } };
      return;
    }

    const { messages, images, sources } = prepared;

    yield { event: 'sources', data: { images, sources } };

    try {
      for await (const chunk of this.ollamaService.chatStream(messages)) {
        if (chunk.content) {
          yield { event: 'token', data: { content: chunk.content } };
        }
      }

      yield { event: 'done', data: {} };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ollama chat stream failed: ${message}`);
      yield { event: 'error', data: { message } };
    }
  }
}
