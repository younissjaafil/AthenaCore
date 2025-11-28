import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SessionStatus } from '../entities/session.entity';

export class UpdateSessionStatusDto {
  @ApiProperty({
    description: 'New session status',
    enum: SessionStatus,
    example: SessionStatus.CONFIRMED,
  })
  @IsEnum(SessionStatus)
  status: SessionStatus;

  @ApiProperty({
    description: 'Notes from creator',
    example: 'Looking forward to our session!',
    required: false,
  })
  @IsString()
  @IsOptional()
  creatorNotes?: string;

  @ApiProperty({
    description: 'Cancellation reason (if status is CANCELLED)',
    example: 'Schedule conflict',
    required: false,
  })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}
