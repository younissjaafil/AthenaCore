import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  creatorId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  systemPrompt: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  temperature: number;

  @ApiProperty()
  maxTokens: number;

  @ApiProperty({ type: [String] })
  category: string[];

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  pricePerMessage: number;

  @ApiProperty()
  pricePerConversation: number;

  @ApiProperty()
  isFree: boolean;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  profileImageUrl?: string;

  @ApiProperty()
  useRag: boolean;

  @ApiProperty()
  ragSimilarityThreshold: number;

  @ApiProperty()
  ragMaxResults: number;

  @ApiProperty()
  ragMaxTokens: number;

  @ApiProperty()
  totalConversations: number;

  @ApiProperty()
  totalMessages: number;

  @ApiProperty()
  averageRating: number;

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
