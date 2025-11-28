import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { SendEmailDto, SendTemplateEmailDto } from './dto/send-email.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { Notification } from './entities/notification.entity';

interface AuthRequest {
  auth: {
    userId: string;
  };
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a custom email notification' })
  @ApiResponse({
    status: 201,
    description: 'Email queued successfully',
    type: NotificationResponseDto,
  })
  async sendEmail(
    @Request() req: AuthRequest,
    @Body() sendEmailDto: SendEmailDto,
  ): Promise<NotificationResponseDto> {
    const userId: string = req.auth.userId;
    const notification = await this.notificationsService.queueEmail({
      userId,
      to: sendEmailDto.to,
      subject: sendEmailDto.subject,
      html: sendEmailDto.html,
      text: sendEmailDto.text,
      priority: sendEmailDto.priority,
    });

    return this.mapToResponseDto(notification);
  }

  @Post('send-template')
  @ApiOperation({ summary: 'Send a templated email' })
  @ApiResponse({
    status: 201,
    description: 'Template email queued successfully',
    type: NotificationResponseDto,
  })
  async sendTemplateEmail(
    @Request() req: AuthRequest,
    @Body() sendTemplateDto: SendTemplateEmailDto,
  ): Promise<NotificationResponseDto> {
    const userId: string = req.auth.userId;

    let notification: Notification;
    switch (sendTemplateDto.template) {
      case 'welcome':
        notification = await this.notificationsService.sendWelcomeEmail(
          userId,
          sendTemplateDto.to,
          (sendTemplateDto.data?.name as string) || 'User',
          sendTemplateDto.data?.verificationLink as string | undefined,
        );
        break;

      case 'payment-confirmation':
        notification = await this.notificationsService.sendPaymentConfirmation(
          userId,
          sendTemplateDto.to,
          sendTemplateDto.data as {
            name: string;
            amount: number;
            currency: string;
            transactionId: string;
            description: string;
            date: string;
          },
        );
        break;

      case 'session-booking':
        notification = await this.notificationsService.sendSessionBooking(
          userId,
          sendTemplateDto.to,
          sendTemplateDto.data as {
            userName: string;
            creatorName: string;
            sessionTitle: string;
            scheduledAt: string;
            duration: number;
            videoUrl: string;
            price: number;
            currency: string;
          },
        );
        break;

      case 'session-reminder':
        notification = await this.notificationsService.sendSessionReminder(
          userId,
          sendTemplateDto.to,
          sendTemplateDto.data as {
            userName: string;
            sessionTitle: string;
            scheduledAt: string;
            videoUrl: string;
            creatorName: string;
          },
        );
        break;

      default:
        notification = await this.notificationsService.queueEmail({
          userId,
          to: sendTemplateDto.to,
          subject: 'Notification',
          html: '<p>No template found</p>',
          priority: sendTemplateDto.priority,
        });
    }

    return this.mapToResponseDto(notification);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({
    status: 200,
    description: 'User notifications retrieved',
    type: [NotificationResponseDto],
  })
  async getMyNotifications(
    @Request() req: AuthRequest,
    @Query('limit') limit?: number,
  ): Promise<NotificationResponseDto[]> {
    const userId: string = req.auth.userId;
    const notifications = await this.notificationsService.getUserNotifications(
      userId,
      limit || 50,
    );
    return notifications.map((n) => this.mapToResponseDto(n));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved',
    type: NotificationResponseDto,
  })
  async getNotificationById(
    @Param('id') id: string,
  ): Promise<NotificationResponseDto | null> {
    const notification =
      await this.notificationsService.getNotificationById(id);
    if (!notification) return null;
    return this.mapToResponseDto(notification);
  }

  private mapToResponseDto(
    notification: Notification,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      status: notification.status,
      priority: notification.priority,
      subject: notification.subject,
      body: notification.body,
      recipient: notification.recipient,
      template: notification.template,
      sentAt: notification.sentAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
