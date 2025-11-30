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

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ name: 'external_id', type: 'varchar', unique: true })
  externalId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'LBP' })
  currency: string;

  @Column({
    type: 'varchar',
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_url', type: 'varchar', nullable: true })
  collectUrl: string;

  @Column({ name: 'payer_name', type: 'varchar', nullable: true })
  payerName: string;

  @Column({ name: 'payer_email', type: 'varchar', nullable: true })
  payerEmail: string;

  @Column({
    name: 'payer_phone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  payerPhoneNumber: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    type?: TransactionType;
    invoice?: string;
    successCallbackUrl?: string;
    failureCallbackUrl?: string;
    successRedirectUrl?: string;
    failureRedirectUrl?: string;
    whishResponse?: any;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;
}
