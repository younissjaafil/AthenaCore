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

  // Vector embedding (1536 dimensions for text-embedding-3-small)
  @Column({
    type: 'vector',
    length: 1536,
  })
  @Index('embedding_vector_idx', { synchronize: false })
  vector: number[];

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
