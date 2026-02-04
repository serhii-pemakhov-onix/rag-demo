import { Module } from '@nestjs/common';
import { OllamaModule } from '../../providers/ollama/ollama.module';
import { VectorModule } from '../../providers/vector/vector.module';
import { RagService } from './rag.service';

@Module({
  imports: [OllamaModule, VectorModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
