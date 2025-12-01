import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './repositories/sessions.repository';
import { Session } from './entities/session.entity';
import { CreatorAvailability } from './entities/creator-availability.entity';
import { SessionSettings } from './entities/session-settings.entity';
import { User } from '../users/entities/user.entity';
import { Creator } from '../creators/entities/creator.entity';
import { UsersModule } from '../users/users.module';
import { CreatorsModule } from '../creators/creators.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityRepository } from './repositories/availability.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      CreatorAvailability,
      SessionSettings,
      User,
      Creator,
    ]),
    UsersModule,
    forwardRef(() => CreatorsModule),
  ],
  controllers: [SessionsController, AvailabilityController],
  providers: [
    SessionsService,
    SessionsRepository,
    AvailabilityService,
    AvailabilityRepository,
  ],
  exports: [SessionsService, AvailabilityService],
})
export class SessionsModule {}
