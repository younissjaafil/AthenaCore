import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export type RagOutcome = 'answered' | 'idk';
export type RagFeedback = 'up' | 'down';

export interface RagCitation {
  documentId: string;
  documentName?: string;
  chunkIndex: number;
  snippet: string;
  similarity: number;
  metadata?: any;
}

@Entity('rag_query_logs')
export class RagQueryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'agent_id' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'text' })
  query: string;

  @Column({ name: 'top_k', default: 5 })
  topK: number;

  @Column({ name: 'retrieved_count', default: 0 })
  retrievedCount: number;

  @Column({ name: 'max_similarity', type: 'float', nullable: true })
  maxSimilarity?: number;

  @Column({ name: 'rerank_used', default: false })
  rerankUsed: boolean;

  @Column({ name: 'latency_ms', type: 'int' })
  latencyMs: number;

  @Column({ name: 'retrieval_ms', type: 'int' })
  retrievalMs: number;

  @Column({ name: 'openai_ms', type: 'int' })
  openaiMs: number;

  @Column({ name: 'context_token_count', type: 'int' })
  contextTokenCount: number;

  @Column()
  model: string;

  @Column({ name: 'total_tokens_approx', type: 'int', default: 0 })
  totalTokensApprox: number;

  @Column({ default: 'answered' })
  outcome: RagOutcome;

  @Column({ name: 'idk_reason', type: 'varchar', nullable: true })
  idkReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  citations?: RagCitation[];

  @Column({ type: 'varchar', nullable: true })
  feedback?: RagFeedback;

  @Column({ name: 'feedback_comment', type: 'text', nullable: true })
  feedbackComment?: string;

  @Column({ name: 'conversation_id', nullable: true })
  conversationId?: string;
}
