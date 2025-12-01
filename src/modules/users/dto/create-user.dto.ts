import { IsEmail, IsOptional, IsString, IsUrl, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/constants/roles.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'user_2abc123def456' })
  @IsString()
  clerkId: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://img.clerk.com/abc123' })
  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;

  @ApiPropertyOptional({
    example: ['user'],
    description: 'User roles array - user, creator, admin',
  })
  @IsOptional()
  @IsArray()
  roles?: UserRole[];
}
