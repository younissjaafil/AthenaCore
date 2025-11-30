import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { VideoProvider } from '../entities/session.entity';

export class BookSessionDto {
  @ApiProperty({
    description: 'Creator ID to book session with',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  creatorId: string;

  @ApiProperty({
    description: 'Scheduled date and time (ISO 8601)',
    example: '2024-12-01T14:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 60,
    minimum: 15,
  })
  @IsInt()
  @Min(15)
  durationMinutes: number;

  @ApiProperty({
    description: 'Video provider',
    enum: VideoProvider,
    example: VideoProvider.JITSI,
    required: false,
  })
  @IsEnum(VideoProvider)
  @IsOptional()
  videoProvider?: VideoProvider;

  @ApiProperty({
    description: 'Session price (if paid)',
    example: 50.0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Student notes or questions',
    example: 'I want to focus on microservices patterns',
    required: false,
  })
  @IsString()
  @IsOptional()
  studentNotes?: string;
}
