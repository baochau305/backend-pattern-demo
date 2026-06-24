import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity.js';
import { numericTransformer } from '../../../shared/database/transformers.js';
import { OrderStatus } from '../constants/order-status.js';
import type { User } from '../../users/entities/user.entity.js';
import type { OrderItem } from './order-item.entity.js';

@Entity('orders')
export class Order extends BaseEntity {
  @ManyToOne('User', (user: User) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  // Denormalised owner id for cheap "my orders" filtering without a join.
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @OneToMany('OrderItem', (item: OrderItem) => item.order, {
    cascade: true, // persisting the order persists its items in the same transaction
    eager: true, // an order is meaningless without its lines, so always load them
  })
  items!: Relation<OrderItem>[];

  // Snapshot of the order total at purchase time (prices may change later).
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    default: 0,
  })
  total!: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;
}
