import { ApiProperty } from '@nestjs/swagger';

export class SystemStatsDto {
  @ApiProperty({ description: 'Total number of users', example: 1250 })
  totalUsers: number;

  @ApiProperty({ description: 'Total number of creators', example: 45 })
  totalCreators: number;

  @ApiProperty({ description: 'Total number of agents', example: 178 })
  totalAgents: number;

  @ApiProperty({ description: 'Total number of documents', example: 892 })
  totalDocuments: number;

  @ApiProperty({
    description: 'Total number of conversations',
    example: 3421,
  })
  totalConversations: number;

  @ApiProperty({ description: 'Total number of sessions', example: 234 })
  totalSessions: number;

  @ApiProperty({
    description: 'Total number of transactions',
    example: 456,
  })
  totalTransactions: number;

  @ApiProperty({
    description: 'Total revenue across all transactions',
    example: 125430.5,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Total number of embeddings',
    example: 15678,
  })
  totalEmbeddings: number;

  @ApiProperty({
    description: 'Number of active users (last 30 days)',
    example: 892,
  })
  activeUsers: number;
}

export class UserStatsDto {
  @ApiProperty({ description: 'User ID', example: 'user_123' })
  userId: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  email: string;

  @ApiProperty({
    description: 'Number of conversations',
    example: 12,
  })
  conversationCount: number;

  @ApiProperty({
    description: 'Number of sessions booked',
    example: 3,
  })
  sessionCount: number;

  @ApiProperty({
    description: 'Number of transactions',
    example: 5,
  })
  transactionCount: number;

  @ApiProperty({
    description: 'Total amount spent',
    example: 150.0,
  })
  totalSpent: number;

  @ApiProperty({
    description: 'Number of active entitlements',
    example: 3,
  })
  entitlementCount: number;

  @ApiProperty({ description: 'Last activity date' })
  lastActivity: Date;
}

export class CreatorStatsDto {
  @ApiProperty({ description: 'Creator ID', example: 'creator_123' })
  creatorId: string;

  @ApiProperty({ description: 'Creator name', example: 'John Doe' })
  creatorName: string;

  @ApiProperty({ description: 'Number of agents created', example: 8 })
  agentCount: number;

  @ApiProperty({
    description: 'Number of sessions completed',
    example: 45,
  })
  sessionCount: number;

  @ApiProperty({ description: 'Total revenue earned', example: 2340.5 })
  totalRevenue: number;

  @ApiProperty({ description: 'Average session rating', example: 4.7 })
  averageRating: number;

  @ApiProperty({
    description: 'Total documents uploaded',
    example: 23,
  })
  documentCount: number;

  @ApiProperty({ description: 'Verification status', example: true })
  isVerified: boolean;
}

export class AgentStatsDto {
  @ApiProperty({ description: 'Agent ID', example: 'agent_123' })
  agentId: string;

  @ApiProperty({ description: 'Agent name', example: 'AI Assistant' })
  agentName: string;

  @ApiProperty({ description: 'Creator name', example: 'John Doe' })
  creatorName: string;

  @ApiProperty({
    description: 'Number of conversations',
    example: 234,
  })
  conversationCount: number;

  @ApiProperty({
    description: 'Number of messages sent',
    example: 1543,
  })
  messageCount: number;

  @ApiProperty({
    description: 'Number of documents',
    example: 12,
  })
  documentCount: number;

  @ApiProperty({
    description: 'Number of embeddings',
    example: 856,
  })
  embeddingCount: number;

  @ApiProperty({
    description: 'Total revenue generated',
    example: 450.0,
  })
  totalRevenue: number;

  @ApiProperty({ description: 'Public visibility status', example: true })
  isPublic: boolean;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;
}
