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

  @Column({ name: 'agent_id', type: 'uuid' })
  @Index()
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ name: 'document_id', type: 'uuid' })
  @Index()
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  // Chunk information
  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'token_count', type: 'int' })
  tokenCount: number;

  @Column({ name: 'start_position', type: 'int', nullable: true })
  startPosition?: number;

  @Column({ name: 'end_position', type: 'int', nullable: true })
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

  // Hierarchical chunking fields
  @Column({ name: 'hierarchy_level', type: 'int', default: 0 })
  @Index()
  hierarchyLevel: number;

  @Column({ name: 'section_path', type: 'text', nullable: true })
  @Index()
  sectionPath?: string;

  @Column({ name: 'parent_chunk_id', type: 'uuid', nullable: true })
  @Index()
  parentChunkId?: string;

  // Note: content_tsvector is managed by PostgreSQL trigger, not exposed in entity

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
