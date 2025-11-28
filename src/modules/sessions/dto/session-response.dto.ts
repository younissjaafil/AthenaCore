import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus, VideoProvider } from '../entities/session.entity';

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
    description: 'Session title',
    example: '1-on-1 Coaching Session',
  })
  title: string;

  @ApiProperty({
    description: 'Session description',
    example: 'Discuss project architecture',
    required: false,
  })
  description?: string;

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
    description: 'Session start time',
    example: '2024-12-01T14:00:00Z',
    required: false,
  })
  startedAt?: Date;

  @ApiProperty({
    description: 'Session end time',
    example: '2024-12-01T15:00:00Z',
    required: false,
  })
  endedAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-11-28T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-11-28T12:00:00Z',
  })
  updatedAt: Date;
}
