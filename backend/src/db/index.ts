import { createPostgresDatabase, type NudePostgresDatabase } from '@lurepos/nude-db';
import type { BackendConfig } from '../config.js';
import * as schema from './schema.js';

export type BackendDatabase = NudePostgresDatabase<typeof schema>;

export function createBackendDatabase(config: BackendConfig): BackendDatabase {
  return createPostgresDatabase({
    url: config.databaseUrl,
    schema,
  });
}

export { schema };
