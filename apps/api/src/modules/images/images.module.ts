import { Module } from '@nestjs/common';
import { OllamaModule } from '../../providers/ollama/ollama.module';
import { StorageModule } from '../../providers/storage/storage.module';
import { VectorModule } from '../../providers/vector/vector.module';
import { AgentsModule } from '../agents/agents.module';
import { ImageProcessingService } from './image-processing.service';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  imports: [StorageModule, AgentsModule, OllamaModule, VectorModule],
  controllers: [ImagesController],
  providers: [ImagesService, ImageProcessingService],
  exports: [ImagesService, ImageProcessingService],
})
export class ImagesModule {}
