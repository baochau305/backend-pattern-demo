import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init0001 implements MigrationInterface {
  name = 'Init0001';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar UNIQUE NOT NULL,
        "passwordHash" varchar NOT NULL,
        "role" varchar NOT NULL DEFAULT 'USER',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "category" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "product" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "price" numeric NOT NULL,
        "stock" int NOT NULL DEFAULT 0,
        "categoryId" uuid REFERENCES "category"("id"),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "order" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid REFERENCES "user"("id"),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "order_item" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orderId" uuid REFERENCES "order"("id"),
        "productId" uuid REFERENCES "product"("id"),
        "quantity" int NOT NULL
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "refresh_token" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "token" varchar UNIQUE NOT NULL,
        "userId" uuid REFERENCES "user"("id"),
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "refresh_token"`);
    await q.query(`DROP TABLE IF EXISTS "order_item"`);
    await q.query(`DROP TABLE IF EXISTS "order"`);
    await q.query(`DROP TABLE IF EXISTS "product"`);
    await q.query(`DROP TABLE IF EXISTS "category"`);
    await q.query(`DROP TABLE IF EXISTS "user"`);
  }
}
