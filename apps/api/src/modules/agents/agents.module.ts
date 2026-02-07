import { forwardRef, Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  imports: [forwardRef(() => RagModule)],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
