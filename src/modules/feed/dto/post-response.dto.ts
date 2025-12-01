import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostVisibility } from '../entities/post.entity';
import { PostMediaType } from '../entities/post-media.entity';

export class PostMediaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  s3Url: string;

  @ApiPropertyOptional()
  s3Key?: string;

  @ApiProperty({ enum: PostMediaType })
  type: PostMediaType;

  @ApiPropertyOptional()
  mimeType?: string;

  @ApiPropertyOptional()
  fileSize?: number;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiPropertyOptional()
  duration?: number;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  sortOrder: number;
}

export class PostCreatorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiProperty()
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };

  @ApiPropertyOptional()
  profile?: {
    handle: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  creatorId: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ enum: PostVisibility })
  visibility: PostVisibility;

  @ApiProperty()
  isPinned: boolean;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  commentsCount: number;

  @ApiProperty()
  viewsCount: number;

  @ApiProperty({ type: [PostMediaResponseDto] })
  media: PostMediaResponseDto[];

  @ApiProperty()
  creator: PostCreatorResponseDto;

  @ApiProperty()
  isLiked: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class FeedResponseDto {
  @ApiProperty({ type: [PostResponseDto] })
  posts: PostResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;
}
