import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from '../entities/conversation.entity';
import { MessageResponseDto } from './message-response.dto';

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Agent ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  agentId: string;

  @ApiPropertyOptional({
    description: 'Conversation title',
    example: 'Discussion about React best practices',
  })
  title?: string;

  @ApiProperty({
    description: 'Conversation status',
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @ApiProperty({
    description: 'Total message count',
    example: 10,
  })
  messageCount: number;

  @ApiPropertyOptional({
    description: 'Timestamp of last message',
    example: '2025-01-15T10:30:00Z',
  })
  lastMessageAt?: Date;

  @ApiPropertyOptional({
    description: 'Agent information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'React Expert',
      tagline: 'Your React development assistant',
    },
  })
  agent?: {
    id: string;
    name: string;
    tagline: string;
  };

  @ApiPropertyOptional({
    description: 'Recent messages in the conversation',
    type: [MessageResponseDto],
  })
  messages?: MessageResponseDto[];

  @ApiProperty({
    description: 'Conversation creation timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Conversation last update timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  updatedAt: Date;
}
