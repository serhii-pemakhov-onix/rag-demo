import { Module } from '@nestjs/common';
import { LlamaIndexModule } from '../../providers/llamaindex/llamaindex.module';
import { OllamaModule } from '../../providers/ollama/ollama.module';
import { QdrantModule } from '../../providers/qdrant/qdrant.module';
import { RagService } from './rag.service';

@Module({
  imports: [LlamaIndexModule, OllamaModule, QdrantModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
