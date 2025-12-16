import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentAnalyticsController } from './agent-analytics.controller';
import { AgentsService } from './agents.service';
import { Agent } from './entities/agent.entity';
import { AgentsRepository } from './repositories/agents.repository';
import { CreatorsModule } from '../creators/creators.module';
import { UsersModule } from '../users/users.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent]),
    forwardRef(() => CreatorsModule),
    UsersModule,
    RagModule,
  ],
  controllers: [AgentsController, AgentAnalyticsController],
  providers: [AgentsService, AgentsRepository],
  exports: [AgentsService, AgentsRepository],
})
export class AgentsModule {}
