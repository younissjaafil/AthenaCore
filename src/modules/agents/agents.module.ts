import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { Agent } from './entities/agent.entity';
import { AgentsRepository } from './repositories/agents.repository';
import { CreatorsModule } from '../creators/creators.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agent]), CreatorsModule],
  controllers: [AgentsController],
  providers: [AgentsService, AgentsRepository],
  exports: [AgentsService],
})
export class AgentsModule {}
