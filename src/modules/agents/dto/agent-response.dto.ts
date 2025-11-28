import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AIModel,
  AgentVisibility,
  AgentStatus,
} from '../entities/agent.entity';

export class AgentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  creatorId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  tagline?: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  systemPrompt: string;

  @ApiPropertyOptional()
  welcomeMessage?: string;

  @ApiProperty({ enum: AIModel })
  model: AIModel;

  @ApiProperty()
  temperature: number;

  @ApiProperty()
  maxTokens: number;

  @ApiProperty()
  topP: number;

  @ApiProperty()
  frequencyPenalty: number;

  @ApiProperty()
  presencePenalty: number;

  @ApiProperty()
  category: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  pricePerMessage: number;

  @ApiProperty()
  pricePerMonth: number;

  @ApiProperty()
  isFree: boolean;

  @ApiProperty({ enum: AgentVisibility })
  visibility: AgentVisibility;

  @ApiProperty({ enum: AgentStatus })
  status: AgentStatus;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  coverImageUrl?: string;

  @ApiProperty()
  ragEnabled: boolean;

  @ApiProperty()
  ragContextSize: number;

  @ApiProperty()
  ragSimilarityThreshold: number;

  @ApiProperty()
  totalConversations: number;

  @ApiProperty()
  totalMessages: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  totalDocuments: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Creator details (joined)
  @ApiPropertyOptional()
  creator?: {
    id: string;
    userId: string;
    bio: string;
    specialties: string[];
    averageRating: number;
  };
}
