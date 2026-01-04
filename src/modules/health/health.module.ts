import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { VectorStoreModule } from '../../infrastructure/vector-store/vector-store.module';

@Module({
  imports: [VectorStoreModule],
  controllers: [HealthController],
})
export class HealthModule {}
