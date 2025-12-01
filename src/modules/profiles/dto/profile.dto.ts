import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({
    description: 'Unique handle (e.g., @johndoe)',
    example: 'johndoe',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Handle can only contain lowercase letters, numbers, and underscores',
  })
  handle: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'John Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Bio/about text' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Unique handle' })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Handle can only contain lowercase letters, numbers, and underscores',
  })
  handle?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Bio/about text' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Banner URL' })
  @IsUrl()
  @IsOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Twitter profile URL' })
  @IsUrl()
  @IsOptional()
  twitterUrl?: string;

  @ApiPropertyOptional({ description: 'LinkedIn profile URL' })
  @IsUrl()
  @IsOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: 'GitHub profile URL' })
  @IsUrl()
  @IsOptional()
  githubUrl?: string;

  @ApiPropertyOptional({ description: 'Instagram profile URL' })
  @IsUrl()
  @IsOptional()
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'YouTube channel URL' })
  @IsUrl()
  @IsOptional()
  youtubeUrl?: string;
}

export class ProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  handle: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  bannerUrl?: string;

  @ApiProperty()
  rankScore: number;

  @ApiPropertyOptional()
  websiteUrl?: string;

  @ApiPropertyOptional()
  twitterUrl?: string;

  @ApiPropertyOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  githubUrl?: string;

  @ApiPropertyOptional()
  instagramUrl?: string;

  @ApiPropertyOptional()
  youtubeUrl?: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  createdAt: Date;

  // Extended info (populated when fetching full profile)
  @ApiPropertyOptional({
    description: 'Whether current user is following this profile',
  })
  isFollowing?: boolean;

  @ApiPropertyOptional({ description: 'Creator ID if user is a creator' })
  creatorId?: string;

  @ApiPropertyOptional({ description: 'Number of agents (if creator)' })
  agentCount?: number;

  @ApiPropertyOptional({ description: 'Number of documents (if creator)' })
  documentCount?: number;

  @ApiPropertyOptional({ description: 'Number of sessions (if creator)' })
  sessionCount?: number;

  @ApiPropertyOptional({ description: 'Average rating (if creator)' })
  averageRating?: number;
}
