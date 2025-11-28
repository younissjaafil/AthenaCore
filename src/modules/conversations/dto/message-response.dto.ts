import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageRole } from '../entities/message.entity';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  conversationId: string;

  @ApiProperty({
    description: 'Message role',
    enum: MessageRole,
    example: MessageRole.USER,
  })
  role: MessageRole;

  @ApiProperty({
    description: 'Message content',
    example: 'What are the best practices for React hooks?',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'Message metadata including RAG sources',
    example: {
      model: 'gpt-4',
      tokensUsed: 150,
      ragContext: true,
      ragSources: [
        {
          documentId: '123e4567-e89b-12d3-a456-426614174002',
          chunkIndex: 0,
          similarity: 0.89,
        },
      ],
    },
  })
  metadata?: any;

  @ApiProperty({
    description: 'Token count for this message',
    example: 42,
  })
  tokenCount: number;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;
}
