import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaGenerateResponse {
  response: string;
}

export interface ImageDescription {
  subject: string;
  setting: string;
  objects: string[];
  colors: string[];
  text: string | null;
  mood: string;
  style: string;
}

export interface VisionResult {
  /** Structured description (only when using default prompt) */
  structured: ImageDescription | null;
  /** Text for embedding - either raw response or converted structured description */
  embeddingText: string;
  /** Raw response from vision model */
  rawResponse: string;
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
}

interface OllamaChatStreamChunk {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly logger = new Logger(OllamaService.name);
  private baseUrl: string;
  private embeddingModel: string;
  private visionModel: string;
  private chatModel: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('OLLAMA_HOST', 'localhost');
    const port = this.configService.get<number>('OLLAMA_PORT', 11434);
    this.baseUrl = `http://${host}:${port}`;
    this.embeddingModel = this.configService.get<string>(
      'OLLAMA_EMBEDDING_MODEL',
      'nomic-embed-text',
    );
    this.visionModel = this.configService.get<string>('OLLAMA_VISION_MODEL', 'llava');
    this.chatModel = this.configService.get<string>('OLLAMA_CHAT_MODEL', 'llama3.2');
  }

  async onModuleInit() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        this.logger.log(`Connected to Ollama at ${this.baseUrl}`);
      }
    } catch {
      this.logger.warn(`Could not connect to Ollama at ${this.baseUrl}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Add prefix for nomic-embed-text model
    const prefixedText = `search_document: ${text}`;

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: prefixedText,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embedding failed: ${error}`);
    }

    const data: OllamaEmbeddingResponse = await response.json();
    return data.embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    // Add query prefix for nomic-embed-text model
    const prefixedQuery = `search_query: ${query}`;

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: prefixedQuery,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embedding failed: ${error}`);
    }

    const data: OllamaEmbeddingResponse = await response.json();
    return data.embedding;
  }

  async generateCompletion(
    prompt: string,
    context?: string,
    model?: string,
  ): Promise<{ response: string }> {
    model = model ?? this.chatModel;
    const fullPrompt = context ? `Context:\n${context}\n\nQuestion: ${prompt}` : prompt;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama completion failed: ${error}`);
    }

    const data: OllamaGenerateResponse = await response.json();
    return { response: data.response };
  }

  async chat(
    messages: { role: string; content: string }[],
    model?: string,
  ): Promise<{ response: string }> {
    model = model ?? this.chatModel;
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama chat failed: ${error}`);
    }

    const data: OllamaChatResponse = await response.json();
    return { response: data.message.content };
  }

  async *chatStream(
    messages: { role: string; content: string }[],
    model?: string,
  ): AsyncGenerator<{ content: string; done: boolean }> {
    model = model ?? this.chatModel;
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama chat stream failed: ${error}`);
    }

    if (!response.body) {
      throw new Error('Ollama chat stream returned no body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const chunk: OllamaChatStreamChunk = JSON.parse(trimmed);
          yield { content: chunk.message.content, done: chunk.done };
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const chunk: OllamaChatStreamChunk = JSON.parse(buffer.trim());
        yield { content: chunk.message.content, done: chunk.done };
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateImageDescription(
    imageBuffer: Buffer,
    agentInstruction?: string,
  ): Promise<VisionResult> {
    const base64Image = imageBuffer.toString('base64');
    const useCustomInstruction = !!agentInstruction;

    const defaultPrompt = `Analyze this image and provide a structured description in JSON format.

Output format (respond with valid JSON only):
{
  "subject": "Main subject or focus of the image",
  "setting": "Location, environment, or background",
  "objects": ["list", "of", "notable", "objects"],
  "colors": ["dominant", "colors"],
  "text": "Any visible text, or null if none",
  "mood": "Emotional tone or atmosphere",
  "style": "Type: photo, illustration, diagram, screenshot, etc."
}`;

    const prompt = agentInstruction || defaultPrompt;

    this.logger.debug(`Calling vision model: ${this.visionModel}`);
    this.logger.debug(`Image size: ${imageBuffer.length} bytes`);
    this.logger.debug(
      `Using ${useCustomInstruction ? 'agent vision instruction' : 'default prompt'}`,
    );

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.visionModel,
        prompt,
        images: [base64Image],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Ollama vision failed with status ${response.status}: ${errorText}`);
      throw new Error(`Ollama vision failed: ${errorText}`);
    }

    const data: OllamaGenerateResponse = await response.json();
    this.logger.debug(`Vision response received: ${data.response.substring(0, 100)}...`);
    const rawResponse = data.response.trim();

    // If using custom agent instruction, use raw text directly for embedding
    if (useCustomInstruction) {
      this.logger.log('Using raw text response for embedding (custom agent instruction)');
      return {
        structured: null,
        embeddingText: rawResponse,
        rawResponse,
      };
    }

    // For default prompt, parse JSON response
    let jsonStr = rawResponse;
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    try {
      const structured = JSON.parse(jsonStr) as ImageDescription;
      return {
        structured,
        embeddingText: this.descriptionToEmbeddingText(structured),
        rawResponse,
      };
    } catch {
      this.logger.warn(`Failed to parse vision response as JSON, using raw text: ${rawResponse}`);
      return {
        structured: null,
        embeddingText: rawResponse,
        rawResponse,
      };
    }
  }

  descriptionToEmbeddingText(description: ImageDescription): string {
    const parts = [
      `Subject: ${description.subject}.`,
      `Setting: ${description.setting}.`,
      description.objects.length > 0 ? `Objects: ${description.objects.join(', ')}.` : '',
      description.colors.length > 0 ? `Colors: ${description.colors.join(', ')}.` : '',
      description.text ? `Text: ${description.text}.` : '',
      `Mood: ${description.mood}.`,
      `Style: ${description.style}.`,
    ];
    return parts.filter(Boolean).join(' ');
  }
}
