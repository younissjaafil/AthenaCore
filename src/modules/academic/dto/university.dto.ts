import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  IsUrl,
  Matches,
} from 'class-validator';

export class CreateUniversityDto {
  @ApiProperty({ example: 'LIU', description: 'University code' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Code must be uppercase letters and numbers only',
  })
  code: string;

  @ApiProperty({
    example: 'Lebanese International University',
    description: 'University name',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'liu',
    description: 'URL-friendly slug (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'University description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Banner URL' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;
}

export class UpdateUniversityDto {
  @ApiPropertyOptional({ example: 'LIU', description: 'University code' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Code must be uppercase letters and numbers only',
  })
  code?: string;

  @ApiPropertyOptional({
    example: 'Lebanese International University',
    description: 'University name',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'liu', description: 'URL-friendly slug' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'University description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Banner URL' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Is university active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
