import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from './entities/notification.entity';
import { EmailJob } from './processors/email.processor';
import { welcomeEmailTemplate } from './templates/welcome.template';
import { paymentConfirmationTemplate } from './templates/payment-confirmation.template';
import { sessionBookingTemplate } from './templates/session-booking.template';
import { sessionReminderTemplate } from './templates/session-reminder.template';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectQueue('email-queue') private readonly emailQueue: Queue<EmailJob>,
  ) {}

  async sendWelcomeEmail(
    userId: string,
    email: string,
    name: string,
    verificationLink?: string,
  ): Promise<Notification> {
    const template = welcomeEmailTemplate({ name, verificationLink });
    return this.queueEmail({
      userId,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'welcome',
      templateData: { name, verificationLink },
      priority: NotificationPriority.HIGH,
    });
  }

  async sendPaymentConfirmation(
    userId: string,
    email: string,
    data: {
      name: string;
      amount: number;
      currency: string;
      transactionId: string;
      description: string;
      date: string;
    },
  ): Promise<Notification> {
    const template = paymentConfirmationTemplate(data);
    return this.queueEmail({
      userId,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'payment-confirmation',
      templateData: data,
      priority: NotificationPriority.HIGH,
    });
  }

  async sendSessionBooking(
    userId: string,
    email: string,
    data: {
      userName: string;
      creatorName: string;
      sessionTitle: string;
      scheduledAt: string;
      duration: number;
      videoUrl: string;
      price: number;
      currency: string;
    },
  ): Promise<Notification> {
    const template = sessionBookingTemplate(data);
    return this.queueEmail({
      userId,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'session-booking',
      templateData: data,
      priority: NotificationPriority.HIGH,
    });
  }

  async sendSessionReminder(
    userId: string,
    email: string,
    data: {
      userName: string;
      sessionTitle: string;
      scheduledAt: string;
      videoUrl: string;
      creatorName: string;
    },
  ): Promise<Notification> {
    const template = sessionReminderTemplate(data);
    return this.queueEmail({
      userId,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'session-reminder',
      templateData: data,
      priority: NotificationPriority.URGENT,
    });
  }

  async queueEmail(options: {
    userId: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    template?: string;
    templateData?: Record<string, any>;
    priority?: NotificationPriority;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: options.userId,
      type: NotificationType.EMAIL,
      status: NotificationStatus.PENDING,
      priority: options.priority || NotificationPriority.NORMAL,
      subject: options.subject,
      body: options.text || options.html,
      recipient: options.to,
      template: options.template,
      templateData: options.templateData,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    const jobPriority = this.getJobPriority(
      options.priority || NotificationPriority.NORMAL,
    );

    await this.emailQueue.add(
      'send-email',
      {
        notificationId: savedNotification.id,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        userId: options.userId,
      },
      {
        priority: jobPriority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    );

    this.logger.log(
      `Queued email notification ${savedNotification.id} for user ${options.userId}`,
    );

    return savedNotification;
  }

  async getUserNotifications(
    userId: string,
    limit = 50,
  ): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    return this.notificationRepository.findOne({ where: { id } });
  }

  async updateNotificationStatus(
    id: string,
    status: NotificationStatus,
  ): Promise<void> {
    await this.notificationRepository.update(id, { status });
  }

  private getJobPriority(priority: NotificationPriority): number {
    const priorityMap = {
      [NotificationPriority.URGENT]: 1,
      [NotificationPriority.HIGH]: 2,
      [NotificationPriority.NORMAL]: 3,
      [NotificationPriority.LOW]: 4,
    };
    return priorityMap[priority] || 3;
  }
}
