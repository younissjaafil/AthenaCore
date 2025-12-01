import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Post } from './post.entity';

export enum PostMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOC_PREVIEW = 'DOC_PREVIEW',
  AUDIO = 'AUDIO',
}

@Entity('post_media')
export class PostMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @ManyToOne(() => Post, (post) => post.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 's3_url', type: 'text' })
  s3Url: string;

  @Column({ name: 's3_key', type: 'varchar', length: 500, nullable: true })
  s3Key?: string;

  @Column({
    type: 'enum',
    enum: PostMediaType,
    default: PostMediaType.IMAGE,
  })
  type: PostMediaType;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number;

  @Column({ type: 'int', nullable: true })
  width?: number;

  @Column({ type: 'int', nullable: true })
  height?: number;

  @Column({ type: 'int', nullable: true })
  duration?: number; // for video/audio in seconds

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl?: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
