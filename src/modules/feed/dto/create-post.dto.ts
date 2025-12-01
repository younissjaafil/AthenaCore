import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  MaxLength,
  IsUrl,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostVisibility } from '../entities/post.entity';
import { PostMediaType } from '../entities/post-media.entity';

export class CreatePostMediaDto {
  @ApiProperty({ description: 'S3 URL of the media' })
  @IsString()
  @IsUrl()
  s3Url: string;

  @ApiPropertyOptional({ description: 'S3 key' })
  @IsOptional()
  @IsString()
  s3Key?: string;

  @ApiProperty({ enum: PostMediaType, default: PostMediaType.IMAGE })
  @IsEnum(PostMediaType)
  type: PostMediaType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ description: 'Duration in seconds for video/audio' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreatePostDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ description: 'Post content body' })
  @IsString()
  body: string;

  @ApiProperty({
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
    description: 'Who can see this post',
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ type: [CreatePostMediaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMediaDto)
  media?: CreatePostMediaDto[];
}
