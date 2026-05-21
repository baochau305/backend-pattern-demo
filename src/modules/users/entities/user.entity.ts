import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity.js';
import { RefreshToken } from '../../auth/entities/refresh-token.entity.js';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', unique: true }) email!: string;
  @Column({ type: 'varchar' }) passwordHash!: string;
  @Column({ type: 'varchar', default: 'USER' }) role!: 'ADMIN' | 'USER';
  @OneToMany(() => Order, (o) => o.user) orders!: Order[];
  @OneToMany(() => RefreshToken, (t) => t.user) refreshTokens!: RefreshToken[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @DeleteDateColumn() deletedAt?: Date;
}
