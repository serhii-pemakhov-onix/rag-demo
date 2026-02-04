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

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
}

@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly logger = new Logger(OllamaService.name);
  private baseUrl: string;
  private embeddingModel: string;
  private visionModel: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('OLLAMA_HOST', 'localhost');
    const port = this.configService.get<number>('OLLAMA_PORT', 11434);
    this.baseUrl = `http://${host}:${port}`;
    this.embeddingModel = this.configService.get<string>('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text');
    this.visionModel = this.configService.get<string>('OLLAMA_VISION_MODEL', 'llava');
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
    model = 'llama3.2',
  ): Promise<{ response: string }> {
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
    model = 'llama3.2',
  ): Promise<{ response: string }> {
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

  async generateImageDescription(
    imageBuffer: Buffer,
    agentInstruction?: string,
  ): Promise<ImageDescription> {
    const base64Image = imageBuffer.toString('base64');

    const basePrompt = `Analyze this image and provide a structured description in JSON format:

{
  "subject": "Main subject or focus of the image",
  "setting": "Location, environment, or background",
  "objects": ["list", "of", "notable", "objects"],
  "colors": ["dominant", "colors"],
  "text": "Any visible text, or null if none",
  "mood": "Emotional tone or atmosphere",
  "style": "Type: photo, illustration, diagram, screenshot, etc."
}

Respond with valid JSON only.`;

    const prompt = agentInstruction ? `${agentInstruction}\n\n${basePrompt}` : basePrompt;

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
      const error = await response.text();
      throw new Error(`Ollama vision failed: ${error}`);
    }

    const data: OllamaGenerateResponse = await response.json();

    // Parse JSON from response, handling potential markdown code blocks
    let jsonStr = data.response.trim();
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
      return JSON.parse(jsonStr) as ImageDescription;
    } catch {
      this.logger.warn(`Failed to parse vision response as JSON: ${data.response}`);
      // Return a fallback description if parsing fails
      return {
        subject: 'Unknown',
        setting: 'Unknown',
        objects: [],
        colors: [],
        text: null,
        mood: 'Unknown',
        style: 'Unknown',
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
