import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Creator, CreatorFollow, CreatorStats, User]),
    UsersModule,
  ],
  controllers: [CreatorsController],
  providers: [CreatorsService, CreatorsRepository, CreatorFollowService],
  exports: [CreatorsService, CreatorsRepository, CreatorFollowService],
})
export class CreatorsModule {}
