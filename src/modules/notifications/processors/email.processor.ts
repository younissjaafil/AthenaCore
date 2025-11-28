import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ResendService } from '../services/resend.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
} from '../entities/notification.entity';

export interface EmailJob {
  notificationId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  userId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly resendService: ResendService,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    const { notificationId, to, subject, html, text } = job.data;

    this.logger.log(
      `Processing email job ${job.id} for notification ${notificationId}`,
    );

    try {
      const result = await this.resendService.sendEmail({
        to,
        subject,
        html,
        text,
      });

      if (result.success) {
        await this.notificationRepository.update(notificationId, {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          metadata: {
            resendId: result.resendId,
            deliveredAt: new Date().toISOString(),
          },
        });

        this.logger.log(
          `Email sent successfully for notification ${notificationId}`,
        );
      } else {
        await this.handleEmailFailure(
          notificationId,
          result.error || 'Unknown error',
          job.attemptsMade,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process email job ${job.id}:`, error);
      await this.handleEmailFailure(
        notificationId,
        errorMessage,
        job.attemptsMade,
      );
      throw error;
    }
  }

  private async handleEmailFailure(
    notificationId: string,
    errorMessage: string,
    attemptsMade: number,
  ): Promise<void> {
    const maxAttempts = 3;
    const status =
      attemptsMade >= maxAttempts
        ? NotificationStatus.FAILED
        : NotificationStatus.PENDING;

    await this.notificationRepository.update(notificationId, {
      status,
      metadata: {
        errorMessage,
        retryCount: attemptsMade,
      },
    });

    if (status === NotificationStatus.FAILED) {
      this.logger.error(
        `Email failed permanently for notification ${notificationId} after ${attemptsMade} attempts`,
      );
    }
  }
}
