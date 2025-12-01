import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { CreatorFollowService } from './creator-follow.service';
import { CreatorsRepository } from './repositories/creators.repository';
import { Creator } from './entities/creator.entity';
import { CreatorFollow } from './entities/creator-follow.entity';
import { CreatorStats } from './entities/creator-stats.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AgentsModule } from '../agents/agents.module';
import { DocumentsModule } from '../documents/documents.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Creator, CreatorFollow, CreatorStats, User]),
    UsersModule,
    forwardRef(() => AgentsModule),
    forwardRef(() => DocumentsModule),
    forwardRef(() => SessionsModule),
  ],
  controllers: [CreatorsController],
  providers: [CreatorsService, CreatorsRepository, CreatorFollowService],
  exports: [CreatorsService, CreatorsRepository, CreatorFollowService],
})
export class CreatorsModule {}
