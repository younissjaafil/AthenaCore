import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { Agent } from './entities/agent.entity';
import { AgentsRepository } from './repositories/agents.repository';
import { CreatorsModule } from '../creators/creators.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent]),
    forwardRef(() => CreatorsModule),
    UsersModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AgentsRepository],
  exports: [AgentsService, AgentsRepository],
})
export class AgentsModule {}
