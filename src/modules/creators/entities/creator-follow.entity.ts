import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Creator } from './creator.entity';

@Entity('creator_follow')
@Unique(['followerUserId', 'creatorId'])
export class CreatorFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'follower_user_id', type: 'uuid' })
  @Index()
  followerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_user_id' })
  follower: User;

  @Column({ name: 'creator_id', type: 'uuid' })
  @Index()
  creatorId: string;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
