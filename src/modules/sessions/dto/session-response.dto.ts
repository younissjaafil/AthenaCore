import { ApiProperty } from '@nestjs/swagger';
import {
  SessionStatus,
  VideoProvider,
  PaymentStatus,
} from '../entities/session.entity';

export class SessionResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID (student)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Creator ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  creatorId: string;

  @ApiProperty({
    description: 'Creator name',
    example: 'Dr. John Smith',
    required: false,
  })
  creatorName?: string;

  @ApiProperty({
    description: 'Student name',
    example: 'Jane Doe',
    required: false,
  })
  studentName?: string;

  @ApiProperty({
    description: 'Scheduled date and time',
    example: '2024-12-01T14:00:00Z',
  })
  scheduledAt: Date;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 60,
  })
  durationMinutes: number;

  @ApiProperty({
    description: 'Session status',
    enum: SessionStatus,
    example: SessionStatus.CONFIRMED,
  })
  status: SessionStatus;

  @ApiProperty({
    description: 'Video provider',
    enum: VideoProvider,
    example: VideoProvider.JITSI,
  })
  videoProvider: VideoProvider;

  @ApiProperty({
    description: 'Video room URL (available for confirmed sessions)',
    example: 'https://meet.jit.si/athena-session-abc123',
    required: false,
  })
  videoRoomUrl?: string;

  @ApiProperty({
    description: 'Video room ID',
    example: 'athena-session-abc123',
    required: false,
  })
  videoRoomId?: string;

  @ApiProperty({
    description: 'Session price',
    example: 50.0,
    required: false,
  })
  price?: number;

  @ApiProperty({
    description: 'Currency',
    example: 'USD',
    required: false,
  })
  currency?: string;

  @ApiProperty({
    description: 'Student notes',
    example: 'Focus on microservices',
    required: false,
  })
  studentNotes?: string;

  @ApiProperty({
    description: 'Creator notes',
    example: 'Prepared materials',
    required: false,
  })
  creatorNotes?: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    description: 'Payment transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false,
  })
  paymentId?: string;

  @ApiProperty({
    description:
      'Whether the meeting link is accessible (paid or free session)',
    example: true,
  })
  canAccessMeeting: boolean;
}
