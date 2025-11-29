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

@Entity('document')
@Index(['agentId', 'status'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id' })
  @Index()
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
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
