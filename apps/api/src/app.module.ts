import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AdminModule } from './modules/admin/admin.module';
// Business logic modules
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { RagModule } from './modules/rag/rag.module';
// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { OllamaModule } from './providers/ollama/ollama.module';
// Provider modules
import { StorageModule } from './providers/storage/storage.module';
import { VectorModule } from './providers/vector/vector.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    ChatModule,
    AdminModule,
    RagModule,
    StorageModule,
    VectorModule,
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
