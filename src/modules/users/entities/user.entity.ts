import { Entity, Column, OneToMany, Index, type Relation } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity.js';
import { Role } from '../../../shared/constants/roles.js';
import type { Order } from '../../orders/entities/order.entity.js';
import type { RefreshToken } from '../../auth/entities/refresh-token.entity.js';

/**
 * `Relation<T>` + `import type` is the TypeORM-recommended pattern for ESM:
 * it keeps the relation fully typed while preventing the circular-import crash
 * that `emitDecoratorMetadata` would otherwise cause when two entities reference
 * each other. The `() => Entity` thunks are evaluated lazily by TypeORM after all
 * modules have loaded.
 */
@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  // Never selected by default queries, so password hashes don't leak accidentally.
  @Column({ type: 'varchar', select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role!: Role;

  @OneToMany('Order', (order: Order) => order.user)
  orders!: Relation<Order>[];

  @OneToMany('RefreshToken', (token: RefreshToken) => token.user)
  refreshTokens!: Relation<RefreshToken>[];
}
