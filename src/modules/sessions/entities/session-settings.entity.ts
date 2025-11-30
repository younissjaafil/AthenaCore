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

  @Column({ type: 'uuid', unique: true })
  creatorId: string;

  @OneToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  // Session durations offered (in minutes)
  @Column({ type: 'int', array: true, default: [30, 60] })
  sessionDurations: number[];

  // Default duration
  @Column({ type: 'int', default: 60 })
  defaultDuration: number;

  // Buffer time between sessions (in minutes)
  @Column({ type: 'int', default: 15 })
  bufferTime: number;

  // Minimum notice for booking (in hours)
  @Column({ type: 'int', default: 1 })
  minimumNoticeHours: number;

  // Maximum advance booking (in days)
  @Column({ type: 'int', default: 30 })
  maxAdvanceBookingDays: number;

  // Auto-confirm sessions
  @Column({ type: 'boolean', default: false })
  autoConfirm: boolean;

  // Allow free sessions
  @Column({ type: 'boolean', default: false })
  allowFreeSession: boolean;

  // Price per session duration (JSON: { "30": 25, "60": 45 })
  @Column({ type: 'jsonb', nullable: true })
  pricePerDuration: Record<string, number>;

  // Timezone
  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  // Session welcome message
  @Column({ type: 'text', nullable: true })
  welcomeMessage: string;

  // Cancellation policy text
  @Column({ type: 'text', nullable: true })
  cancellationPolicy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
