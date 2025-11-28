import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../../../common/constants/roles.enum';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'User roles to assign',
    enum: UserRole,
    isArray: true,
    example: [UserRole.STUDENT, UserRole.CREATOR],
  })
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}

export class DeactivateUserDto {
  @ApiProperty({
    description: 'Reason for deactivation',
    example: 'Terms of service violation',
    required: false,
  })
  @IsOptional()
  reason?: string;
}

export class BulkUserActionDto {
  @ApiProperty({
    description: 'Array of user IDs to perform action on',
    type: [String],
    example: ['user_123', 'user_456', 'user_789'],
  })
  userIds: string[];

  @ApiProperty({
    description: 'Reason for the action',
    example: 'Bulk cleanup operation',
    required: false,
  })
  @IsOptional()
  reason?: string;
}
