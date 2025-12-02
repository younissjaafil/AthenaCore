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
@Index(['creatorId', 'date'], { unique: true })
export class DateOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => Creator)
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', nullable: true })
  startTime: string | null;

  @Column({ type: 'time', nullable: true })
  endTime: string | null;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
