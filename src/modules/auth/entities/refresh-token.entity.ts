import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { User } from '../../users/entities/user.entity.js';

/**
 * Persisted refresh tokens, used to implement secure rotation and revocation.
 *
 * We store only a SHA-256 *hash* of the token (`tokenHash`), never the raw value —
 * so a database leak cannot be replayed as a valid token, exactly like password
 * hashing. `revokedAt` supports rotation (old token invalidated when a new one is
 * issued) and explicit logout; `expiresAt` bounds the token's lifetime.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @ManyToOne('User', (user: User) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
