import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from '../../users/entities/user.entity';

@Entity('post_comment')
@Index(['postId', 'createdAt'])
export class PostComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string;

  @ManyToOne(() => PostComment, (comment) => comment.replies, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: PostComment;

  @OneToMany(() => PostComment, (comment) => comment.parent)
  replies: PostComment[];

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({ name: 'is_edited', default: false })
  isEdited: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual field - set by query
  isLiked?: boolean;
}
