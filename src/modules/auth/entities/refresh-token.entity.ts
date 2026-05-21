import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) token!: string;
  // Use a structural type to avoid runtime metadata referencing User before init.
  @ManyToOne(() => User, (u) => u.refreshTokens) user!: { id: string };
  @CreateDateColumn() createdAt!: Date;
}
