import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../../../common/constants/roles.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clerk_id', unique: true })
  @Index()
  clerkId: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ name: 'first_name', nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', nullable: true })
  lastName?: string;

  @Column({ name: 'profile_image_url', nullable: true })
  profileImageUrl?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ name: 'is_admin', default: false })
  isAdmin: boolean;

  @Column({ name: 'has_completed_onboarding', default: false })
  hasCompletedOnboarding: boolean;

  @Column({ name: 'is_learner', default: false })
  isLearner: boolean;

  @Column({ name: 'is_creator_intent', default: false })
  isCreatorIntent: boolean;

  @Column({ name: 'has_completed_discovery', default: false })
  hasCompletedDiscovery: boolean;

  @Column({ name: 'intent_selected_at', type: 'timestamptz', nullable: true })
  intentSelectedAt?: Date;

  @Column({
    name: 'last_activity_context',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  lastActivityContext?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual property for full name
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.email;
  }
}
