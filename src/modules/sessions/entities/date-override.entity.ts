import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('date_overrides')
@Index(['creatorId', 'date'], { unique: true })
export class DateOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  creatorId: string;

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
