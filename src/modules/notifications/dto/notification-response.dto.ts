import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.EMAIL,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Notification status',
    enum: NotificationStatus,
    example: NotificationStatus.SENT,
  })
  status: NotificationStatus;

  @ApiProperty({
    description: 'Priority level',
    enum: NotificationPriority,
    example: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Subject/title',
    example: 'Welcome to Athena',
  })
  subject: string;

  @ApiProperty({
    description: 'Notification body',
    example: 'Thank you for joining our platform',
  })
  body: string;

  @ApiProperty({
    description: 'Recipient (email/phone)',
    example: 'user@example.com',
    required: false,
  })
  recipient?: string;

  @ApiProperty({
    description: 'Template used',
    example: 'welcome',
    required: false,
  })
  template?: string;

  @ApiProperty({
    description: 'Sent timestamp',
    example: '2024-11-28T10:00:00Z',
    required: false,
  })
  sentAt?: Date;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2024-11-28T09:55:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated timestamp',
    example: '2024-11-28T10:00:00Z',
  })
  updatedAt: Date;
}
