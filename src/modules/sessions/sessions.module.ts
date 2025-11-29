import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './repositories/sessions.repository';
import { Session } from './entities/session.entity';
import { User } from '../users/entities/user.entity';
import { Creator } from '../creators/entities/creator.entity';
import { ConfigModule } from '../../config/config.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, User, Creator]),
    ConfigModule,
    UsersModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsService],
})
export class SessionsModule {}
