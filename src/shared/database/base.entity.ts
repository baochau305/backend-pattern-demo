import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Shared columns for every domain entity (DRY): a UUID primary key plus audit
 * timestamps. `@DeleteDateColumn` enables TypeORM *soft deletes* — `softRemove`/
 * `softDelete` sets `deletedAt` and all default queries automatically exclude
 * rows where it is non-null, so records are recoverable and referential history
 * is preserved.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
