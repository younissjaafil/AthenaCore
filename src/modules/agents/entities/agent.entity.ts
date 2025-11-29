import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Creator } from '../../creators/entities/creator.entity';

export enum AgentVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

export enum AgentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum AIModel {
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_35_TURBO = 'gpt-3.5-turbo',
  CLAUDE_3_OPUS = 'claude-3-opus',
  CLAUDE_3_SONNET = 'claude-3-sonnet',
  CLAUDE_3_HAIKU = 'claude-3-haiku',
}

@Entity('agent')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  // AI Configuration
  @Column({
    type: 'varchar',
    default: 'gpt-4',
  })
  model: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.7 })
  temperature: number;

  @Column({ name: 'max_tokens', type: 'int', default: 2000 })
  maxTokens: number;

  // Categorization - stored as array in DB
  @Column({ type: 'varchar', array: true, default: [] })
  category: string[];

  @Column({ type: 'varchar', array: true, default: [] })
  tags: string[];

  // Pricing
  @Column({
    name: 'price_per_message',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  pricePerMessage: number;

  @Column({
    name: 'price_per_conversation',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  pricePerConversation: number;

  @Column({ name: 'is_free', type: 'boolean', default: false })
  isFree: boolean;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  // Status
  @Column({
    type: 'varchar',
    default: 'draft',
  })
  status: string;

  // Media
  @Column({ name: 'profile_image_url', type: 'varchar', nullable: true })
  profileImageUrl: string;

  // RAG Configuration
  @Column({ name: 'use_rag', type: 'boolean', default: true })
  useRag: boolean;

  @Column({
    name: 'rag_similarity_threshold',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0.7,
  })
  ragSimilarityThreshold: number;

  @Column({ name: 'rag_max_results', type: 'int', default: 5 })
  ragMaxResults: number;

  @Column({ name: 'rag_max_tokens', type: 'int', default: 3000 })
  ragMaxTokens: number;

  // Statistics
  @Column({ name: 'total_conversations', type: 'int', default: 0 })
  totalConversations: number;

  @Column({ name: 'total_messages', type: 'int', default: 0 })
  totalMessages: number;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  averageRating: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
