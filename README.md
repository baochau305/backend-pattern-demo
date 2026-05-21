# Backend Pattern Demo

Production-style Node.js + TypeScript e-commerce API focused on architecture.

## Architecture

- Modular structure similar to NestJS
- Controller -> Service -> Repository pattern
- Shared cross-cutting concerns (config, logger, cache, queue, errors)

## Setup

```bash
cp .env.example .env
docker compose up
```

## API Docs

Swagger: `GET /docs`

## Caching Strategy

Cache-aside for product list/detail using Redis:

1. Check Redis
2. Cache miss -> DB
3. Store with TTL
   Invalidated on product mutations.

## Transactions & Race Conditions

Order creation uses DB transaction and pessimistic locking:
`SELECT ... FOR UPDATE` ensures stock updates are serialized to prevent overselling.

## Queue System

BullMQ queues for email and analytics with retries and workers.

## Project Structure (simplified)

```
src/
  modules/
  shared/
  main.ts
```

## ERD

Entities: User, Product, Category, Order, OrderItem, RefreshToken.

## Security

JWT, password hashing, helmet, cors, rate limiting.
