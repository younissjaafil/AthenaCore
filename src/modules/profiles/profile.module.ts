import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile, CreatorTestimonial, UserFollow } from './entities';
import { User } from '../users/entities/user.entity';
import { Creator } from '../creators/entities/creator.entity';
import { ProfileService } from './profile.service';
import {
  ProfileController,
  TestimonialsController,
} from './profile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProfile,
      CreatorTestimonial,
      UserFollow,
      User,
      Creator,
    ]),
  ],
  controllers: [ProfileController, TestimonialsController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
