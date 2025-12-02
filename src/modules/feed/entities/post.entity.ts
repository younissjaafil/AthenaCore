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
import { Creator } from '../../creators/entities/creator.entity';
import { PostMedia } from './post-media.entity';
import { PostLike } from './post-like.entity';
import { PostComment } from './post-comment.entity';

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  SUBSCRIBERS = 'SUBSCRIBERS',
}

@Entity('post')
@Index(['creatorId', 'createdAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', type: 'uuid', nullable: true })
  creatorId: string | null;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
  })
  visibility: PostVisibility;

  @Column({ name: 'is_pinned', default: false })
  isPinned: boolean;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({ name: 'comments_count', default: 0 })
  commentsCount: number;

  @Column({ name: 'views_count', default: 0 })
  viewsCount: number;

  @OneToMany(() => PostMedia, (media) => media.post, { cascade: true })
  media: PostMedia[];

  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];

  @OneToMany(() => PostComment, (comment) => comment.post)
  comments: PostComment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual field - set by query
  isLiked?: boolean;
}
