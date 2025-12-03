import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Major } from './major.entity';
import { Creator } from '../../creators/entities/creator.entity';

@Entity('course')
@Unique(['majorId', 'code'])
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'major_id', type: 'uuid' })
  @Index()
  majorId: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  slug: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  semester?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'integer', nullable: true })
  credits?: number;

  // Course Jarvis - the AI creator for this course
  @Column({ name: 'creator_id', type: 'uuid', nullable: true, unique: true })
  @Index()
  creatorId?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Major, (major) => major.courses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'major_id' })
  major?: Major;

  // Course Jarvis creator
  @OneToOne(() => Creator, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'creator_id' })
  creator?: Creator;
}
