import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpertiseLevel } from '../entities/creator.entity';

export class CreateCreatorDto {
  @ApiProperty({
    description: 'Creator title/role (e.g., "AI Expert", "Math Tutor")',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Creator bio/description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ description: 'Short tagline' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @ApiPropertyOptional({ description: 'Areas of expertise', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: 'Creator categories', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Expertise level',
    enum: ExpertiseLevel,
  })
  @IsOptional()
  @IsEnum(ExpertiseLevel)
  expertiseLevel?: ExpertiseLevel;

  @ApiPropertyOptional({ description: 'Hourly rate in USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Minimum booking amount in USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumBooking?: number;

  @ApiPropertyOptional({ description: 'Availability status' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
