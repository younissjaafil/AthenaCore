import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/constants/roles.enum';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://img.clerk.com/abc123' })
  profileImageUrl?: string;

  @ApiProperty({
    example: ['user'],
    description: 'User roles array',
  })
  roles: UserRole[];

  @ApiProperty({ example: false, description: 'Computed from roles array' })
  isCreator: boolean;

  @ApiProperty({ example: false, description: 'Computed from roles array' })
  isAdmin: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
