import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Embedding } from './entities/embedding.entity';
import { EmbeddingsRepository } from './repositories/embeddings.repository';
import { EmbeddingsService } from './embeddings.service';
import { VectorSearchService } from './vector-search.service';
import { RagController } from './rag.controller';
import { DocumentsModule } from '../documents/documents.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Embedding]),
    CacheModule.register(),
    DocumentsModule,
    UsersModule,
  ],
  controllers: [RagController],
  providers: [EmbeddingsRepository, EmbeddingsService, VectorSearchService],
  exports: [EmbeddingsService, VectorSearchService],
})
export class RagModule {}
