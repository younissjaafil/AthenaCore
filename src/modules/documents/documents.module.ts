import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfPreviewService } from './pdf-preview.service';
import { Document } from './entities/document.entity';
import { DocumentsRepository } from './repositories/documents.repository';
import { AgentsModule } from '../agents/agents.module';
import { S3Module } from '../../infrastructure/storage/s3.module';
import { UsersModule } from '../users/users.module';
import { RagModule } from '../rag/rag.module';
import { CreatorsModule } from '../creators/creators.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    AgentsModule,
    S3Module,
    UsersModule,
    forwardRef(() => RagModule),
    forwardRef(() => CreatorsModule),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfPreviewService, DocumentsRepository],
  exports: [DocumentsService, PdfPreviewService, DocumentsRepository],
})
export class DocumentsModule {}
