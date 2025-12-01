import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsString()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ description: 'Updated comment content', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  content: string;
}

export class CommentAuthorDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  profileImageUrl?: string;
}

export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  isEdited: boolean;

  @ApiProperty()
  author: CommentAuthorDto;

  @ApiProperty()
  isLiked: boolean;

  @ApiProperty()
  repliesCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CommentsResponseDto {
  @ApiProperty({ type: [CommentResponseDto] })
  comments: CommentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;
}
