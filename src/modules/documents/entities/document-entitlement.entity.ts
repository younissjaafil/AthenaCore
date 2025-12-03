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
import { Document } from './document.entity';

/**
 * Document Entitlement - Grants a user access to a paid document
 * Similar to agent entitlements but for individual documents
 */
@Entity('document_entitlement')
@Index(['userId', 'documentId'], { unique: true })
@Index(['userId', 'expiresAt'])
export class DocumentEntitlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Track how the entitlement was granted
  @Column({
    name: 'grant_type',
    type: 'varchar',
    length: 20,
    default: 'purchase',
  })
  grantType: 'purchase' | 'subscription' | 'gift' | 'admin';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
