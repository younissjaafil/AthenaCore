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

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'scheduled_time', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.PENDING,
  })
  status: SessionStatus;

  @Column({
    name: 'video_provider',
    type: 'enum',
    enum: VideoProvider,
    default: VideoProvider.JITSI,
  })
  videoProvider: VideoProvider;

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

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string;

  @Column({ name: 'student_notes', type: 'text', nullable: true })
  studentNotes: string;

  @Column({ name: 'creator_notes', type: 'text', nullable: true })
  creatorNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    cancellationReason?: string;
    cancelledBy?: string;
    rescheduledFrom?: string;
    videoProviderData?: any;
  };

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
