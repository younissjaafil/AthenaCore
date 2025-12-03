import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import {
  UniversitiesRepository,
  MajorsRepository,
  CoursesRepository,
} from './repositories';
import { University, Major, Course } from './entities';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../profiles/entities';
import { Creator } from '../creators/entities/creator.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      University,
      Major,
      Course,
      User,
      UserProfile,
      Creator,
    ]),
  ],
  controllers: [AcademicController],
  providers: [
    AcademicService,
    UniversitiesRepository,
    MajorsRepository,
    CoursesRepository,
  ],
  exports: [AcademicService],
})
export class AcademicModule {}
