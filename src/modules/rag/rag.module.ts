import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Embedding } from './entities/embedding.entity';
import { RagQueryLog } from './entities/rag-query-log.entity';
import { EmbeddingsRepository } from './repositories/embeddings.repository';
import { EmbeddingsService } from './embeddings.service';
import { VectorSearchService } from './vector-search.service';
import { RagQueryLogService } from './rag-query-log.service';
import { RagController } from './rag.controller';
import { DocumentsModule } from '../documents/documents.module';
import { UsersModule } from '../users/users.module';
import { VectorStoreModule } from '../../infrastructure/vector-store/vector-store.module';
import { SummaryService } from './summary.service';
import { BM25Service } from './bm25.service';
import { RerankerService } from './reranker.service';
import { HybridSearchService } from './hybrid-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Embedding, RagQueryLog]),
    CacheModule.register(),
    VectorStoreModule,
    forwardRef(() => DocumentsModule),
    UsersModule,
  ],
  controllers: [RagController],
  providers: [
    EmbeddingsRepository,
    EmbeddingsService,
    VectorSearchService,
    RagQueryLogService,
    SummaryService,
    BM25Service,
    RerankerService,
    HybridSearchService,
  ],
  exports: [
    EmbeddingsService,
    VectorSearchService,
    RagQueryLogService,
    SummaryService,
    BM25Service,
    RerankerService,
    HybridSearchService,
  ],
})
export class RagModule {}
