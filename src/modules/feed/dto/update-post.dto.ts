import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { PostVisibility } from '../entities/post.entity';

export class UpdatePostDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Post content body' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({
    enum: PostVisibility,
    description: 'Who can see this post',
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ description: 'Pin post to top of profile' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
