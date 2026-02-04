import { Module } from '@nestjs/common';
import { StorageModule } from '../../providers/storage/storage.module';
import { AgentsModule } from '../agents/agents.module';
import { RagModule } from '../rag/rag.module';
import { DocumentProcessingService } from './document-processing.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [StorageModule, AgentsModule, RagModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentProcessingService],
  exports: [DocumentsService, DocumentProcessingService],
})
export class DocumentsModule {}
