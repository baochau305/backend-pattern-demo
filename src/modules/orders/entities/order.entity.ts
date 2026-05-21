import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { OrderItem } from './order-item.entity.js';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid') id!: string;
  // Use a structural type to avoid runtime metadata referencing User before init.
  @ManyToOne(() => User, (u) => u.orders) user!: { id: string };
  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items!: OrderItem[]; // Cascade ensures items persist with order
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date; // Updated on change
  @DeleteDateColumn() deletedAt?: Date; // Soft delete column
}
