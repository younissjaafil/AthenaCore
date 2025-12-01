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
import { User } from '../../users/entities/user.entity';

@Entity('user_profile')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index()
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  handle: string;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  displayName?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

  @Column({ name: 'banner_url', type: 'varchar', length: 500, nullable: true })
  bannerUrl?: string;

  @Column({ name: 'rank_score', type: 'int', default: 0 })
  @Index()
  rankScore: number;

  // Social Links
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

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'follower_count', type: 'int', default: 0 })
  followerCount: number;

  @Column({ name: 'following_count', type: 'int', default: 0 })
  followingCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
