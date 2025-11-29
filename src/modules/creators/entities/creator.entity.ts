import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CreatorStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
}

export enum ExpertiseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
  MASTER = 'master',
}

@Entity('creator')
export class Creator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'text', nullable: true })
  tagline: string;

  @Column({ type: 'varchar', array: true, default: [] })
  specialties: string[];

  @Column({ type: 'varchar', array: true, default: [] })
  categories: string[];

  @Column({
    type: 'enum',
    enum: ExpertiseLevel,
    default: ExpertiseLevel.BEGINNER,
  })
  expertiseLevel: ExpertiseLevel;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourlyRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumBooking: number;

  // Social Links
  @Column({ type: 'varchar', nullable: true })
  websiteUrl: string;

  @Column({ type: 'varchar', nullable: true })
  linkedinUrl: string;

  @Column({ type: 'varchar', nullable: true })
  twitterUrl: string;

  @Column({ type: 'varchar', nullable: true })
  githubUrl: string;

  // Verification & Status
  @Column({
    type: 'enum',
    enum: CreatorStatus,
    default: CreatorStatus.PENDING,
  })
  status: CreatorStatus;

  @Column({ type: 'boolean', default: false })
  isAvailable: boolean;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string;

  // Statistics
  @Column({ type: 'int', default: 0 })
  totalAgents: number;

  @Column({ type: 'int', default: 0 })
  totalSessions: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEarnings: number;

  // Payout Information
  @Column({ type: 'varchar', nullable: true })
  payoutEmail: string;

  @Column({ type: 'varchar', nullable: true })
  payoutMethod: string; // 'stripe', 'paypal', 'whish', etc.

  @Column({ type: 'jsonb', nullable: true })
  payoutDetails: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
