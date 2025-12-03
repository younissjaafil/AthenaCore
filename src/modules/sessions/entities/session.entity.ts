import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Creator } from '../../creators/entities/creator.entity';

export enum SessionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum PaymentStatus {
  NOT_REQUIRED = 'not_required', // Free session or not yet confirmed
  PENDING = 'pending', // Confirmed, awaiting payment
  PAID = 'paid', // Payment received
  REFUNDED = 'refunded', // Payment refunded
}

export enum VideoProvider {
  JITSI = 'jitsi',
  DAILY = 'daily',
}

@Entity('session')
@Index(['userId', 'status'])
@Index(['creatorId', 'status'])
@Index(['scheduledAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'creator_id', type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  @Column({ name: 'scheduled_time', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  status: string;

  @Column({ name: 'video_provider', type: 'varchar', nullable: true })
  videoProvider: string;

  @Column({
    name: 'video_room_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  videoRoomUrl: string;

  @Column({
    name: 'video_room_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  videoRoomId: string;

  @Column({ name: 'student_notes', type: 'text', nullable: true })
  studentNotes: string;

  @Column({ name: 'creator_notes', type: 'text', nullable: true })
  creatorNotes: string;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 20,
    default: PaymentStatus.NOT_REQUIRED,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string;

  // Optional link to a course for course-specific sessions
  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  @Index()
  courseId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
