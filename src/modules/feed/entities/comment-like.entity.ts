import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { PostComment } from './post-comment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comment_like')
@Unique(['commentId', 'userId'])
export class CommentLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @ManyToOne(() => PostComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: PostComment;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
