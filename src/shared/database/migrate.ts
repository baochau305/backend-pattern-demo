import { dataSource } from './data-source.js';

const run = async () => {
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
};

run();
