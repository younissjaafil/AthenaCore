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
import { User } from '../../users/entities/user.entity';
import { Agent } from '../../agents/entities/agent.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum TransactionType {
  AGENT_PURCHASE = 'agent_purchase',
  SUBSCRIPTION = 'subscription',
  SESSION_BOOKING = 'session_booking',
  CREDIT_PURCHASE = 'credit_purchase',
}

export enum Currency {
  LBP = 'LBP',
  USD = 'USD',
  AED = 'AED',
}

@Entity('transaction')
@Index(['userId', 'status'])
@Index(['externalId'], { unique: true })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'bigint', unique: true })
  externalId: number;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'text' })
  invoice: string;

  @Column({ type: 'varchar', length: 500 })
  collectUrl: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  payerPhoneNumber: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    successCallbackUrl?: string;
    failureCallbackUrl?: string;
    successRedirectUrl?: string;
    failureRedirectUrl?: string;
    whishResponse?: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
