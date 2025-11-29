import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ description: 'Agent name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Agent description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'System prompt for the AI' })
  @IsString()
  systemPrompt: string;

  @ApiPropertyOptional({ description: 'AI model to use' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Temperature (0-2)',
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Max tokens', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Agent categories', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category?: string[];

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Price per message in USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerMessage?: number;

  @ApiPropertyOptional({ description: 'Price per conversation in USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerConversation?: number;

  @ApiPropertyOptional({ description: 'Is agent free to use' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Is agent public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Agent status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;

  @ApiPropertyOptional({ description: 'Enable RAG for this agent' })
  @IsOptional()
  @IsBoolean()
  useRag?: boolean;

  @ApiPropertyOptional({ description: 'Similarity threshold for RAG (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ragSimilarityThreshold?: number;

  @ApiPropertyOptional({ description: 'Max results for RAG' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  ragMaxResults?: number;

  @ApiPropertyOptional({ description: 'Max tokens for RAG context' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  ragMaxTokens?: number;
}
