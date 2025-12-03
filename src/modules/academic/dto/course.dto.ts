import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsInt,
  MaxLength,
  MinLength,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ description: 'Major ID' })
  @IsUUID()
  majorId: string;

  @ApiProperty({ example: 'CSCI300', description: 'Course code' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Data Structures', description: 'Course title' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 'data-structures',
    description: 'URL-friendly slug (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'Spring 2026',
    description: 'Semester (free text)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  semester?: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 3, description: 'Credit hours' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  credits?: number;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'CSCI300', description: 'Course code' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    example: 'Data Structures',
    description: 'Course title',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'data-structures',
    description: 'URL-friendly slug',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'Spring 2026',
    description: 'Semester (free text)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  semester?: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 3, description: 'Credit hours' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  credits?: number;

  @ApiPropertyOptional({ description: 'Is course active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
