import 'reflect-metadata';
import { dataSource } from './data-source.js';
import { logger } from '../logger/pino.js';

/** Runs all pending migrations, then exits. Invoked by the container entrypoint. */
const run = async (): Promise<void> => {
  await dataSource.initialize();
  const migrations = await dataSource.runMigrations();
  logger.info(
    { applied: migrations.map((m) => m.name) },
    `Ran ${migrations.length} migration(s)`,
  );
  await dataSource.destroy();
};

run().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
