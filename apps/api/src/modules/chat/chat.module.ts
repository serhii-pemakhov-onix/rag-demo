import { Module } from '@nestjs/common';
import { OllamaModule } from '../../providers/ollama/ollama.module';
import { AgentsModule } from '../agents/agents.module';
import { RagModule } from '../rag/rag.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [RagModule, AgentsModule, OllamaModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
