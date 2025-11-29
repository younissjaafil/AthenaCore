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
import { Document } from '../../documents/entities/document.entity';
import { Agent } from '../../agents/entities/agent.entity';

@Entity('embeddings')
@Index(['agentId', 'documentId'])
@Index(['agentId', 'chunkIndex'])
export class Embedding {
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
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  // Chunk information
  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  tokenCount: number;

  @Column({ type: 'int', nullable: true })
  startPosition?: number;

  @Column({ type: 'int', nullable: true })
  endPosition?: number;

  // Note: Vector is stored in Qdrant, not PostgreSQL
  // This field is kept for type compatibility but not persisted
  vector?: number[];

  // Embedding metadata
  @Column({ default: 'text-embedding-3-small' })
  model: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    heading?: string;
    section?: string;
    pageNumber?: number;
    language?: string;
    keywords?: string[];
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
