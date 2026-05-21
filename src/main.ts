import 'reflect-metadata';
import 'dotenv/config';

if (!process.env.REDIS_HOST || process.env.REDIS_HOST === 'redis') {
  process.env.REDIS_HOST = '127.0.0.1';
}
if (!process.env.REDIS_URL || process.env.REDIS_URL.includes('redis://redis')) {
  process.env.REDIS_URL = 'redis://127.0.0.1:6379';
}
if (!process.env.DB_HOST || process.env.DB_HOST === 'postgres') {
  process.env.DB_HOST = '127.0.0.1';
}
if (
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('postgres://postgres')
) {
  process.env.DATABASE_URL =
    'postgres://postgres:postgres@127.0.0.1:5432/postgres';
}

const { createApp } = await import('./shared/app.js');

const app = await createApp();
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
