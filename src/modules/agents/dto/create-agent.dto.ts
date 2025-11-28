import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AIModel,
  AgentVisibility,
  AgentStatus,
} from '../entities/agent.entity';

export class CreateAgentDto {
  @ApiProperty({ description: 'Agent name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Short tagline', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagline?: string;

  @ApiProperty({ description: 'Agent description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'System prompt for the AI' })
  @IsString()
  systemPrompt: string;

  @ApiPropertyOptional({ description: 'Welcome message for users' })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'AI model to use', enum: AIModel })
  @IsOptional()
  @IsEnum(AIModel)
  model?: AIModel;

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

  @ApiPropertyOptional({ description: 'Top P (0-1)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({
    description: 'Frequency penalty (-2 to 2)',
    minimum: -2,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @ApiPropertyOptional({
    description: 'Presence penalty (-2 to 2)',
    minimum: -2,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;

  @ApiProperty({ description: 'Agent category' })
  @IsString()
  @MaxLength(100)
  category: string;

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

  @ApiPropertyOptional({ description: 'Monthly subscription price in USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerMonth?: number;

  @ApiPropertyOptional({ description: 'Is agent free to use' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({
    description: 'Agent visibility',
    enum: AgentVisibility,
  })
  @IsOptional()
  @IsEnum(AgentVisibility)
  visibility?: AgentVisibility;

  @ApiPropertyOptional({ description: 'Agent status', enum: AgentStatus })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'Enable RAG for this agent' })
  @IsOptional()
  @IsBoolean()
  ragEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Number of context chunks for RAG' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  ragContextSize?: number;

  @ApiPropertyOptional({ description: 'Similarity threshold for RAG (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ragSimilarityThreshold?: number;
}
