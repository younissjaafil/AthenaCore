import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Creator } from '../../creators/entities/creator.entity';
import { User } from '../../users/entities/user.entity';

@Entity('creator_testimonial')
@Unique(['creatorId', 'authorUserId'])
export class CreatorTestimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', type: 'uuid' })
  @Index()
  creatorId: string;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  @Column({ name: 'author_user_id', type: 'uuid' })
  @Index()
  authorUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_user_id' })
  author: User;

  @Column({ type: 'int' })
  @Index()
  rating: number;

  @Column({ type: 'text', nullable: true })
  text?: string;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
