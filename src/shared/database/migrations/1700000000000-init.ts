import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema. Hand-written (rather than generated) so it is reviewable and
 * its intent is explicit: UUID PKs, soft-delete timestamps, native enum types,
 * foreign keys with deliberate ON DELETE behaviour, and the indexes that back the
 * product search/filter and "my orders" query paths.
 */
export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await q.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM ('ADMIN', 'USER');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await q.query(`
      DO $$ BEGIN
        CREATE TYPE "orders_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await q.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL,
        "name" varchar(255),
        "passwordHash" varchar NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'USER',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);

    await q.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_categories_name" ON "categories" ("name")`,
    );

    await q.query(`
      CREATE TABLE "products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "price" numeric(12,2) NOT NULL,
        "stock" int NOT NULL DEFAULT 0,
        "categoryId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "FK_products_category" FOREIGN KEY ("categoryId")
          REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);
    await q.query(`CREATE INDEX "IDX_products_name" ON "products" ("name")`);
    await q.query(
      `CREATE INDEX "IDX_products_categoryId" ON "products" ("categoryId")`,
    );

    await q.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "status" "orders_status_enum" NOT NULL DEFAULT 'PENDING',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX "IDX_orders_userId" ON "orders" ("userId")`);

    await q.query(`
      CREATE TABLE "order_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "quantity" int NOT NULL,
        "unitPrice" numeric(12,2) NOT NULL,
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product" FOREIGN KEY ("productId")
          REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);
    await q.query(
      `CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId")`,
    );

    await q.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tokenHash" varchar(64) NOT NULL,
        "userId" uuid NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "revokedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX "IDX_refresh_tokens_tokenHash" ON "refresh_tokens" ("tokenHash")`,
    );
    await q.query(
      `CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await q.query(`DROP TABLE IF EXISTS "order_items"`);
    await q.query(`DROP TABLE IF EXISTS "orders"`);
    await q.query(`DROP TABLE IF EXISTS "products"`);
    await q.query(`DROP TABLE IF EXISTS "categories"`);
    await q.query(`DROP TABLE IF EXISTS "users"`);
    await q.query(`DROP TYPE IF EXISTS "orders_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
