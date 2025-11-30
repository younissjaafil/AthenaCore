import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsArray,
  IsString,
  IsObject,
} from 'class-validator';

export class UpdateSessionSettingsDto {
  @ApiProperty({
    description: 'Session durations offered in minutes',
    example: [30, 60],
    required: false,
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  sessionDurations?: number[];

  @ApiProperty({
    description: 'Default session duration in minutes',
    example: 60,
    required: false,
  })
  @IsInt()
  @Min(15)
  @Max(180)
  @IsOptional()
  defaultDuration?: number;

  @ApiProperty({
    description: 'Buffer time between sessions in minutes',
    example: 15,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(60)
  @IsOptional()
  bufferTime?: number;

  @ApiProperty({
    description: 'Minimum notice for booking in hours',
    example: 24,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(168)
  @IsOptional()
  minimumNoticeHours?: number;

  @ApiProperty({
    description: 'Maximum advance booking in days',
    example: 30,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  maxAdvanceBookingDays?: number;

  @ApiProperty({
    description: 'Auto-confirm sessions',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  autoConfirm?: boolean;

  @ApiProperty({
    description: 'Allow free sessions',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  allowFreeSession?: boolean;

  @ApiProperty({
    description: 'Price per duration (e.g., { "30": 25, "60": 45 })',
    example: { '30': 25, '60': 45 },
    required: false,
  })
  @IsObject()
  @IsOptional()
  pricePerDuration?: Record<string, number>;

  @ApiProperty({
    description: 'Timezone',
    example: 'America/New_York',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    description: 'Welcome message for sessions',
    required: false,
  })
  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @ApiProperty({
    description: 'Cancellation policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  cancellationPolicy?: string;
}

export class SessionSettingsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  creatorId: string;

  @ApiProperty()
  sessionDurations: number[];

  @ApiProperty()
  defaultDuration: number;

  @ApiProperty()
  bufferTime: number;

  @ApiProperty()
  minimumNoticeHours: number;

  @ApiProperty()
  maxAdvanceBookingDays: number;

  @ApiProperty()
  autoConfirm: boolean;

  @ApiProperty()
  allowFreeSession: boolean;

  @ApiProperty()
  pricePerDuration?: Record<string, number>;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  welcomeMessage?: string;

  @ApiProperty()
  cancellationPolicy?: string;
}
