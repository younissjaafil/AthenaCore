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

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
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
    name: 'expertise_level',
    type: 'enum',
    enum: ExpertiseLevel,
    default: ExpertiseLevel.BEGINNER,
  })
  expertiseLevel: ExpertiseLevel;

  // Pricing
  @Column({
    name: 'hourly_rate',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  hourlyRate: number;

  @Column({
    name: 'minimum_booking',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  minimumBooking: number;

  // Social Links
  @Column({ name: 'website_url', type: 'varchar', nullable: true })
  websiteUrl: string;

  @Column({ name: 'linkedin_url', type: 'varchar', nullable: true })
  linkedinUrl: string;

  @Column({ name: 'twitter_url', type: 'varchar', nullable: true })
  twitterUrl: string;

  @Column({ name: 'github_url', type: 'varchar', nullable: true })
  githubUrl: string;

  // Verification & Status
  @Column({
    type: 'enum',
    enum: CreatorStatus,
    default: CreatorStatus.PENDING,
  })
  status: CreatorStatus;

  @Column({ name: 'is_available', type: 'boolean', default: false })
  isAvailable: boolean;

  @Column({ name: 'verification_notes', type: 'text', nullable: true })
  verificationNotes: string;

  // Statistics
  @Column({ name: 'total_agents', type: 'int', default: 0 })
  totalAgents: number;

  @Column({ name: 'total_sessions', type: 'int', default: 0 })
  totalSessions: number;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  averageRating: number;

  @Column({ name: 'total_reviews', type: 'int', default: 0 })
  totalReviews: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
