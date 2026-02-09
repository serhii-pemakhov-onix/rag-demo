import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
// Business logic modules
import { AgentsModule } from './modules/agents/agents.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ImagesModule } from './modules/images/images.module';
import { RagModule } from './modules/rag/rag.module';
// Core modules
import { PrismaModule } from './prisma/prisma.module';
// Provider modules
import { LlamaIndexModule } from './providers/llamaindex/llamaindex.module';
import { OllamaModule } from './providers/ollama/ollama.module';
import { QdrantModule } from './providers/qdrant/qdrant.module';
import { StorageModule } from './providers/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '..', '.env'), // apps/api/.env when compiled
        '.env', // fallback to cwd
      ],
    }),
    PrismaModule,
    AuthModule,
    AgentsModule,
    DocumentsModule,
    ImagesModule,
    ChatModule,
    RagModule,
    StorageModule,
    LlamaIndexModule,
    QdrantModule,
    OllamaModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
