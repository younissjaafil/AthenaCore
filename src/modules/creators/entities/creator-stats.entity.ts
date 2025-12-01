import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Creator } from './creator.entity';

@Entity('creator_stats')
export class CreatorStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', type: 'uuid', unique: true })
  @Index()
  creatorId: string;

  @OneToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  @Column({ name: 'followers_count', type: 'int', default: 0 })
  @Index()
  followersCount: number;

  @Column({ name: 'subscribers_count', type: 'int', default: 0 })
  subscribersCount: number;

  @Column({
    name: 'total_earnings',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalEarnings: number;

  @Column({ name: 'total_sessions', type: 'int', default: 0 })
  totalSessions: number;

  @Column({ name: 'completed_sessions', type: 'int', default: 0 })
  completedSessions: number;

  @Column({ name: 'total_conversations', type: 'int', default: 0 })
  totalConversations: number;

  @Column({ name: 'total_agents', type: 'int', default: 0 })
  totalAgents: number;

  @Column({ name: 'total_documents', type: 'int', default: 0 })
  totalDocuments: number;

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

  @Column({
    name: 'rank_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  @Index()
  rankScore: number;

  @Column({ name: 'rank_position', type: 'int', default: 0 })
  rankPosition: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
