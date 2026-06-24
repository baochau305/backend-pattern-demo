import { Entity, Column, OneToMany, Index, type Relation } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity.js';
import type { Product } from '../../products/entities/product.entity.js';

@Entity('categories')
export class Category extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @OneToMany('Product', (product: Product) => product.category)
  products!: Relation<Product>[];
}
