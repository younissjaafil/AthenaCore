import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateMajorDto {
  @ApiProperty({ description: 'University ID' })
  @IsUUID()
  universityId: string;

  @ApiProperty({ example: 'CS', description: 'Major code' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Code must be uppercase letters and numbers only',
  })
  code: string;

  @ApiProperty({ example: 'Computer Science', description: 'Major name' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'computer-science',
    description: 'URL-friendly slug (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Major description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateMajorDto {
  @ApiPropertyOptional({ example: 'CS', description: 'Major code' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Code must be uppercase letters and numbers only',
  })
  code?: string;

  @ApiPropertyOptional({
    example: 'Computer Science',
    description: 'Major name',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'computer-science',
    description: 'URL-friendly slug',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Major description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is major active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
