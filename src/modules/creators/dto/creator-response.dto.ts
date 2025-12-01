import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorStatus, ExpertiseLevel } from '../entities/creator.entity';

export class CreatorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  tagline?: string;

  @ApiProperty({ type: [String] })
  specialties: string[];

  @ApiProperty({ type: [String] })
  categories: string[];

  @ApiProperty({ enum: ExpertiseLevel })
  expertiseLevel: ExpertiseLevel;

  @ApiProperty()
  hourlyRate: number;

  @ApiProperty()
  minimumBooking: number;

  @ApiPropertyOptional()
  websiteUrl?: string;

  @ApiPropertyOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  twitterUrl?: string;

  @ApiPropertyOptional()
  githubUrl?: string;

  @ApiProperty({ enum: CreatorStatus })
  status: CreatorStatus;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  totalAgents: number;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // User details (joined from User entity)
  @ApiPropertyOptional()
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };

  // Profile details (joined from UserProfile entity)
  @ApiPropertyOptional()
  profile?: {
    handle: string;
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  };
}
