import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Order } from './order.entity.js';
import { Product } from '../../products/entities/product.entity.js';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  // Use a structural type to avoid runtime metadata referencing Order before init.
  @ManyToOne(() => Order, (o) => o.items) order!: { id: string };
  @ManyToOne(() => Product) product!: Product; // Relation kept for eager access
  @Column() quantity!: number;
}
