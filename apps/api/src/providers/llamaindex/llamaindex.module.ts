import { Module } from '@nestjs/common';
import { LlamaIndexService } from './llamaindex.service';

@Module({
  providers: [LlamaIndexService],
  exports: [LlamaIndexService],
})
export class LlamaIndexModule {}
