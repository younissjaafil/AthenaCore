import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { University } from './university.entity';
import { Course } from './course.entity';

@Entity('major')
@Unique(['universityId', 'code'])
export class Major {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'university_id', type: 'uuid' })
  @Index()
  universityId: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => University, (university) => university.majors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'university_id' })
  university?: University;

  @OneToMany(() => Course, (course) => course.major)
  courses?: Course[];
}
