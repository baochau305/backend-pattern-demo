import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity.js';

@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  name!: string;
  @OneToMany(() => Product, (p) => p.category) products!: Product[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @DeleteDateColumn() deletedAt?: Date;
}
