import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { ResendService } from './services/resend.service';
import { EmailProcessor } from './processors/email.processor';
import { UsersModule } from '../users/users.module';

const redisEnabled = process.env.REDIS_ENABLED?.toLowerCase() !== 'false';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    ...(redisEnabled
      ? [
          BullModule.registerQueue({
            name: 'email-queue',
          }),
        ]
      : []),
    ConfigModule,
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    ResendService,
    ...(redisEnabled ? [EmailProcessor] : []),
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
