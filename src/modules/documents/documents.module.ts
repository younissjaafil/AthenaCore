import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { DocumentsRepository } from './repositories/documents.repository';
import { AgentsModule } from '../agents/agents.module';
import { S3Module } from '../../infrastructure/storage/s3.module';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), AgentsModule, S3Module],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository],
  exports: [DocumentsService, DocumentsRepository],
})
export class DocumentsModule {}
