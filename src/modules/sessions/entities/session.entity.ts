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

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.PENDING,
  })
  status: SessionStatus;

  @Column({
    type: 'enum',
    enum: VideoProvider,
    default: VideoProvider.JITSI,
  })
  videoProvider: VideoProvider;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoRoomUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  videoRoomId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string;

  @Column({ type: 'text', nullable: true })
  studentNotes: string;

  @Column({ type: 'text', nullable: true })
  creatorNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    cancellationReason?: string;
    cancelledBy?: string;
    rescheduledFrom?: string;
    videoProviderData?: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
