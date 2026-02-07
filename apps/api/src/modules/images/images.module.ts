import { Module } from '@nestjs/common';
import { OllamaModule } from '../../providers/ollama/ollama.module';
import { StorageModule } from '../../providers/storage/storage.module';
import { AgentsModule } from '../agents/agents.module';
import { RagModule } from '../rag/rag.module';
import { ImageProcessingService } from './image-processing.service';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  imports: [StorageModule, AgentsModule, OllamaModule, RagModule],
  controllers: [ImagesController],
  providers: [ImagesService, ImageProcessingService],
  exports: [ImagesService, ImageProcessingService],
})
export class ImagesModule {}
