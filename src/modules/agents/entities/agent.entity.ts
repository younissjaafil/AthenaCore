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

  @Column({ type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  tagline: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ type: 'text', nullable: true })
  welcomeMessage: string;

  // AI Configuration
  @Column({
    type: 'enum',
    enum: AIModel,
    default: AIModel.GPT_35_TURBO,
  })
  model: AIModel;

  @Column({ type: 'float', default: 0.7 })
  temperature: number;

  @Column({ type: 'int', default: 2000 })
  maxTokens: number;

  @Column({ type: 'float', default: 0.9 })
  topP: number;

  @Column({ type: 'float', default: 0 })
  frequencyPenalty: number;

  @Column({ type: 'float', default: 0 })
  presencePenalty: number;

  // Categorization
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', array: true, default: [] })
  tags: string[];

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pricePerMessage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pricePerMonth: number;

  @Column({ type: 'boolean', default: true })
  isFree: boolean;

  // Visibility & Status
  @Column({
    type: 'enum',
    enum: AgentVisibility,
    default: AgentVisibility.PRIVATE,
  })
  visibility: AgentVisibility;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.DRAFT,
  })
  status: AgentStatus;

  // Media
  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string;

  @Column({ type: 'varchar', nullable: true })
  coverImageUrl: string;

  // RAG Configuration
  @Column({ type: 'boolean', default: false })
  ragEnabled: boolean;

  @Column({ type: 'int', default: 5 })
  ragContextSize: number;

  @Column({ type: 'float', default: 0.7 })
  ragSimilarityThreshold: number;

  // Statistics
  @Column({ type: 'int', default: 0 })
  totalConversations: number;

  @Column({ type: 'int', default: 0 })
  totalMessages: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @Column({ type: 'int', default: 0 })
  totalDocuments: number;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
