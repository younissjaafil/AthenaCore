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

  @ApiPropertyOptional({ example: 'John Doe' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://img.clerk.com/abc123' })
  profileImageUrl?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT })
  role: UserRole;

  @ApiProperty({ example: false })
  isAdmin: boolean;

  @ApiProperty({ example: false })
  hasCompletedOnboarding: boolean;

  @ApiProperty({
    example: false,
    description: 'User wants to learn from creators',
  })
  isLearner: boolean;

  @ApiProperty({
    example: false,
    description: 'User intends to become a creator',
  })
  isCreatorIntent: boolean;

  @ApiProperty({
    example: false,
    description: 'User has completed initial discovery/explore phase',
  })
  hasCompletedDiscovery: boolean;

  @ApiPropertyOptional({ description: 'When user selected their intent' })
  intentSelectedAt?: Date;

  @ApiPropertyOptional({
    example: 'creator-dashboard',
    description: 'Last activity context for smart redirects',
  })
  lastActivityContext?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
