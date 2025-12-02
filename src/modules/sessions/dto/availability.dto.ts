import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
  IsString,
  Matches,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../entities/creator-availability.entity';

export class TimeSlotDto {
  @ApiProperty({
    description: 'Day of week (0=Sunday, 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: DayOfWeek;

  @ApiProperty({
    description: 'Start time in HH:MM format',
    example: '09:00',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:MM format',
    example: '17:00',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:MM format',
  })
  endTime: string;

  @ApiProperty({
    description: 'Whether this slot is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SetAvailabilityDto {
  @ApiProperty({
    description: 'Array of availability time slots',
    type: [TimeSlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  slots: TimeSlotDto[];
}

export class AvailabilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  creatorId: string;

  @ApiProperty()
  dayOfWeek: DayOfWeek;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  isActive: boolean;
}

export class AvailableSlotsQueryDto {
  @ApiProperty({
    description: 'Creator ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  creatorId: string;

  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2024-12-01',
  })
  @IsString()
  startDate: string;

  @ApiProperty({
    description: 'End date (ISO 8601)',
    example: '2024-12-07',
  })
  @IsString()
  endDate: string;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 60,
    required: false,
  })
  @IsInt()
  @IsOptional()
  duration?: number;
}

export class TimeSlotAvailableDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2024-12-01',
  })
  date: string;

  @ApiProperty({
    description: 'Available time slots for the day (in creator timezone)',
    example: ['09:00', '10:00', '11:00', '14:00', '15:00'],
  })
  slots: string[];

  @ApiProperty({
    description: 'Creator timezone (IANA format)',
    example: 'Asia/Beirut',
    required: false,
  })
  timezone?: string;
}

// Date Override DTOs (simple version for Lebanon)
export class DateOverrideDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2025-12-02',
  })
  @IsString()
  date: string;

  @ApiProperty({
    description: 'Start time in HH:MM format',
    example: '10:00',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:MM format',
    example: '11:30',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:MM format',
  })
  endTime: string;
}

export class SetDateOverridesDto {
  @ApiProperty({
    description: 'Array of date-specific availability overrides',
    type: [DateOverrideDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateOverrideDto)
  overrides: DateOverrideDto[];
}

export class DateOverrideResponseDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;
}
