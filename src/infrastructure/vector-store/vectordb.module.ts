import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VectorDbService } from './vectordb.service';

@Module({
  imports: [TypeOrmModule],
  providers: [VectorDbService],
  exports: [VectorDbService],
})
export class VectorDbModule {}
