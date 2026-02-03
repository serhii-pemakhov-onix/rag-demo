import { Injectable } from '@nestjs/common';

@Injectable()
export class OllamaService {
  async generateEmbedding(text: string) {
    // TODO: Implement Ollama embedding generation
    return [];
  }

  async generateCompletion(prompt: string, context?: string) {
    // TODO: Implement Ollama LLM completion
    return { response: '' };
  }

  async chat(messages: { role: string; content: string }[]) {
    // TODO: Implement Ollama chat
    return { response: '' };
  }
}
