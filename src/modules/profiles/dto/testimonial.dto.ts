import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTestimonialDto {
  @ApiProperty({ description: 'Rating from 1-5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Testimonial text' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  text?: string;
}

export class UpdateTestimonialDto {
  @ApiPropertyOptional({ description: 'Rating from 1-5' })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Testimonial text' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  text?: string;
}

export class TestimonialResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  creatorId: string;

  @ApiProperty()
  authorUserId: string;

  @ApiProperty()
  rating: number;

  @ApiPropertyOptional()
  text?: string;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  createdAt: Date;

  // Populated author info
  @ApiPropertyOptional()
  author?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    handle: string;
  };
}

export class TestimonialsStatsDto {
  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty({ description: 'Count per rating (1-5)' })
  distribution: Record<number, number>;
}
