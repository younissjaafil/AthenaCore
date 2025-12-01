import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_follow')
@Unique(['followerId', 'followingId'])
@Check('"follower_id" != "following_id"')
export class UserFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'follower_id', type: 'uuid' })
  @Index()
  followerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @Column({ name: 'following_id', type: 'uuid' })
  @Index()
  followingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
