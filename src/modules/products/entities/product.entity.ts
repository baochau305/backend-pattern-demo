import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity.js';
import { numericTransformer } from '../../../shared/database/transformers.js';
import type { Category } from '../../categories/entities/category.entity.js';

@Entity('products')
export class Product extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Money as numeric(12,2) + transformer => exact decimal stored, JS number in app.
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  price!: number;

  // Stock is an integer so it can be decremented atomically and never go fractional.
  @Column({ type: 'int', default: 0 })
  stock!: number;

  @ManyToOne('Category', (category: Category) => category.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category!: Relation<Category> | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;
}
