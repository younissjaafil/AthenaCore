import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  UserRole,
  isCreator,
  isAdmin,
} from '../../../common/constants/roles.enum';

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

  @Column({ unique: true, nullable: true })
  @Index()
  username?: string;

  @Column({ name: 'first_name', nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', nullable: true })
  lastName?: string;

  @Column({ name: 'profile_image_url', nullable: true })
  profileImageUrl?: string;

  // Roles array: ['user'], ['user', 'creator'], ['user', 'admin'], ['user', 'creator', 'admin']
  @Column({ type: 'varchar', array: true, default: ['user'] })
  roles: UserRole[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual properties
  get isCreator(): boolean {
    return isCreator(this.roles);
  }

  get isAdmin(): boolean {
    return isAdmin(this.roles);
  }
}
