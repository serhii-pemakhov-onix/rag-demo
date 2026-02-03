import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  async processMessage(message: string) {
    // TODO: Implement RAG-based chat processing
    return {
      response: `Echo: ${message}`,
      sources: [],
    };
  }
}
