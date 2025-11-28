import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { VectorDbService } from './vectordb.service';

@Module({
  imports: [ConfigModule],
  providers: [VectorDbService],
  exports: [VectorDbService],
})
export class VectorDbModule {}
