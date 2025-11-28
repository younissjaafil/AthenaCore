import { ApiProperty } from '@nestjs/swagger';

export class AdminActionResponseDto {
  @ApiProperty({
    description: 'Success status of the operation',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Result message',
    example: 'User deactivated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Additional data returned from the operation',
    required: false,
  })
  data?: any;
}

export class BulkOperationResponseDto {
  @ApiProperty({
    description: 'Number of successful operations',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Total number of operations attempted',
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Details of failed operations',
    type: [String],
    example: ['user_123: User not found', 'user_456: Already deactivated'],
  })
  errors: string[];
}
