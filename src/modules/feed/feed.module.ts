import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedController, CreatorPostsController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedRepository } from './repositories/feed.repository';
import {
  Post,
  PostMedia,
  PostLike,
  PostComment,
  CommentLike,
} from './entities';
import { CreatorsModule } from '../creators/creators.module';
import { UsersModule } from '../users/users.module';
import { UserProfile } from '../profiles/entities/user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostMedia,
      PostLike,
      PostComment,
      CommentLike,
      UserProfile,
    ]),
    forwardRef(() => CreatorsModule),
    UsersModule,
  ],
  controllers: [FeedController, CreatorPostsController],
  providers: [FeedService, FeedRepository],
  exports: [FeedService],
})
export class FeedModule {}
