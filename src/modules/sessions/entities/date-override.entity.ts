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
import { Creator } from '../../creators/entities/creator.entity';

@Entity('date_overrides')
@Index(['creatorId', 'date'])
export class DateOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD format

  @Column({ type: 'time', nullable: true })
  startTime: string | null; // HH:MM format, null if blocked

  @Column({ type: 'time', nullable: true })
  endTime: string | null; // HH:MM format, null if blocked

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean; // true = available, false = blocked

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
