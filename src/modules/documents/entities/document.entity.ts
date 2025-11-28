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
import { User } from '../../users/entities/user.entity';

export enum DocumentStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
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

@Entity('documents')
@Index(['agentId', 'status'])
@Index(['userId', 'createdAt'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // File Information
  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  type: DocumentType;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number; // in bytes

  // S3 Storage
  @Column()
  s3Key: string;

  @Column()
  s3Bucket: string;

  @Column({ nullable: true })
  s3Url?: string;

  // Processing Information
  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADING,
  })
  @Index()
  status: DocumentStatus;

  @Column({ type: 'int', default: 0 })
  chunkCount: number; // Number of text chunks created

  @Column({ type: 'int', default: 0 })
  embeddingCount: number; // Number of embeddings generated

  @Column({ type: 'text', nullable: true })
  extractedText?: string; // Full extracted text

  @Column({ type: 'int', nullable: true })
  characterCount?: number;

  @Column({ type: 'int', nullable: true })
  wordCount?: number;

  @Column({ type: 'int', nullable: true })
  pageCount?: number;

  // Error Handling
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

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

  // Processing Timestamps
  @Column({ type: 'timestamp', nullable: true })
  processingStartedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  processingCompletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
