import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Creator } from '../../creators/entities/creator.entity';

@Entity('session_settings')
export class SessionSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', type: 'uuid', unique: true })
  creatorId: string;

  @OneToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  // Session durations offered (in minutes)
  @Column({
    name: 'session_durations',
    type: 'int',
    array: true,
    default: [30, 60],
  })
  sessionDurations: number[];

  // Default duration
  @Column({ name: 'default_duration', type: 'int', default: 60 })
  defaultDuration: number;

  // Buffer time between sessions (in minutes)
  @Column({ name: 'buffer_time', type: 'int', default: 15 })
  bufferTime: number;

  // Minimum notice for booking (in hours)
  @Column({ name: 'minimum_notice_hours', type: 'int', default: 1 })
  minimumNoticeHours: number;

  // Maximum advance booking (in days)
  @Column({ name: 'max_advance_booking_days', type: 'int', default: 30 })
  maxAdvanceBookingDays: number;

  // Auto-confirm sessions
  @Column({ name: 'auto_confirm', type: 'boolean', default: false })
  autoConfirm: boolean;

  // Allow free sessions
  @Column({ name: 'allow_free_session', type: 'boolean', default: false })
  allowFreeSession: boolean;

  // Price per session duration (JSON: { "30": 25, "60": 45 })
  @Column({ name: 'price_per_duration', type: 'jsonb', nullable: true })
  pricePerDuration: Record<string, number>;

  // Timezone
  @Column({ type: 'varchar', length: 50, default: 'Asia/Beirut' })
  timezone: string;

  // Session welcome message
  @Column({ name: 'welcome_message', type: 'text', nullable: true })
  welcomeMessage: string;

  // Cancellation policy text
  @Column({ name: 'cancellation_policy', type: 'text', nullable: true })
  cancellationPolicy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
