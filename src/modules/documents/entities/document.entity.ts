import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
  MD = 'md',
  HTML = 'html',
  CSV = 'csv',
  JSON = 'json',
}

// Owner type: who owns this document
export enum DocumentOwnerType {
  AGENT = 'AGENT', // Traditional RAG docs for an agent (backwards compatible)
  CREATOR = 'CREATOR', // Creator's profile content
  // CLASS_BOT = 'CLASS_BOT', // Future: Jarvis family bots
}

// Document kind: what type of content
export enum DocumentKind {
  DOC = 'DOC', // PDF, DOCX, TXT, etc.
  VIDEO = 'VIDEO', // MP4, MOV, etc.
  IMAGE = 'IMAGE', // PNG, JPG, etc.
  AUDIO = 'AUDIO', // MP3, WAV, etc.
}

// Visibility: who can see this document
export enum DocumentVisibility {
  PUBLIC = 'PUBLIC', // Anyone can see
  FOLLOWERS = 'FOLLOWERS', // Only followers
  SUBSCRIBERS = 'SUBSCRIBERS', // Only subscribers (paid)
  // CLASS_ONLY = 'CLASS_ONLY', // Future: Only class members
  PRIVATE = 'PRIVATE', // Only owner
}

// Pricing type: how is this document monetized
export enum DocumentPricingType {
  FREE = 'FREE', // No payment required
  ONE_TIME = 'ONE_TIME', // One-time purchase
  SUBSCRIPTION = 'SUBSCRIPTION', // Part of subscription
  // CLASS_ONLY = 'CLASS_ONLY', // Future: Included with class enrollment
}

@Entity('document')
@Index(['agentId', 'status'])
@Index(['ownerType', 'ownerId'])
@Index(['contentHash'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== OWNERSHIP (NEW) =====
  @Column({
    name: 'owner_type',
    type: 'varchar',
    length: 20,
    default: DocumentOwnerType.AGENT,
  })
  ownerType: DocumentOwnerType;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string;

  // Legacy: agent_id kept for backwards compatibility with existing RAG
  @Column({ name: 'agent_id', nullable: true })
  @Index()
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  // File Information
  @Column()
  filename: string;

  @Column({ name: 'original_filename' })
  originalFilename: string;

  @Column({ name: 'file_type' })
  fileType: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  // S3 Storage
  @Column({ name: 's3_key' })
  s3Key: string;

  @Column({ name: 's3_url', nullable: true })
  s3Url?: string;

  // Processing Information
  @Column({
    default: DocumentStatus.UPLOADED,
  })
  @Index()
  status: string;

  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText?: string;

  @Column({ name: 'chunk_count', type: 'int', default: 0 })
  chunkCount: number;

  @Column({ name: 'embedding_count', type: 'int', default: 0 })
  embeddingCount: number;

  // Error Handling
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  // ===== USAGE FLAGS (NEW) =====
  @Column({ name: 'for_profile', type: 'boolean', default: false })
  forProfile: boolean;

  @Column({ name: 'for_rag', type: 'boolean', default: true })
  forRag: boolean;

  // @Column({ name: 'for_class', type: 'boolean', default: false })
  // forClass: boolean; // Future: for CLASS_BOT

  // ===== CONTENT CLASSIFICATION (NEW) =====
  @Column({
    type: 'varchar',
    length: 20,
    default: DocumentKind.DOC,
  })
  kind: DocumentKind;

  @Column({
    type: 'varchar',
    length: 20,
    default: DocumentVisibility.PRIVATE,
  })
  visibility: DocumentVisibility;

  // ===== MONETIZATION (NEW) =====
  @Column({
    name: 'pricing_type',
    type: 'varchar',
    length: 20,
    default: DocumentPricingType.FREE,
  })
  pricingType: DocumentPricingType;

  @Column({ name: 'price_cents', type: 'int', nullable: true })
  priceCents: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // ===== DEDUPLICATION (NEW) =====
  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true })
  contentHash: string;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    title?: string;
    author?: string;
    language?: string;
    tags?: string[];
    description?: string;
    [key: string]: any;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
