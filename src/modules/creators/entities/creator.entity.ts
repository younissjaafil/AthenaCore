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

export enum ExpertiseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
}

@Entity('creator_profile')
export class Creator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
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

  // Availability
  @Column({ name: 'is_available', type: 'boolean', default: false })
  isAvailable: boolean;

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

  @Column({ name: 'rank_score', type: 'int', default: 0 })
  rankScore: number;

  // Social Links (only for creators)
  @Column({ name: 'website_url', type: 'varchar', length: 500, nullable: true })
  websiteUrl?: string;

  @Column({ name: 'twitter_url', type: 'varchar', length: 500, nullable: true })
  twitterUrl?: string;

  @Column({
    name: 'linkedin_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  linkedinUrl?: string;

  @Column({ name: 'github_url', type: 'varchar', length: 500, nullable: true })
  githubUrl?: string;

  @Column({
    name: 'instagram_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  instagramUrl?: string;

  @Column({ name: 'youtube_url', type: 'varchar', length: 500, nullable: true })
  youtubeUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
