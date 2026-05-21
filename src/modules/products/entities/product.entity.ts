import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity.js';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  name!: string;
  @Column('decimal', { precision: 10, scale: 2 }) price!: number; // Stored as decimal for currency
  // Stock is kept as integer for safe decrement operations.
  @Column({ type: 'int', default: 0 }) stock!: number;
  @ManyToOne(() => Category, (c) => c.products) category!: Category; // Optional in early seed stages
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @DeleteDateColumn() deletedAt?: Date;
}
