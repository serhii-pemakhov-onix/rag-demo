import { Injectable } from '@nestjs/common';
import { SentenceSplitter } from 'llamaindex';

@Injectable()
export class LlamaIndexService {
  chunkText(text: string, chunkSize = 512, overlap = 100): string[] {
    const splitter = new SentenceSplitter({
      chunkSize,
      chunkOverlap: overlap,
    });

    return splitter.splitText(text);
  }
}
