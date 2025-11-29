import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { ResendService } from './services/resend.service';
import { EmailProcessor } from './processors/email.processor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    BullModule.registerQueue({
      name: 'email-queue',
    }),
    ConfigModule,
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ResendService, EmailProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
