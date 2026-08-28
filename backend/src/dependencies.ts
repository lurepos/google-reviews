import { createBackendDatabase, type BackendDatabase } from './db/index.js';
import type { BackendConfig } from './config.js';
import { createAuthService, type AuthService } from './auth.js';
import { createLlmService, type LlmService } from './services/llm.js';
import { createGoogleApiService, type GoogleApiService } from './services/google-api.js';

export interface BackendDependencies {
  config: BackendConfig;
  database: BackendDatabase;
  db: BackendDatabase['db'];
  auth: AuthService;
  llm: LlmService;
  googleApi: GoogleApiService;
}

export function createBackendDependencies(config: BackendConfig): BackendDependencies {
  const database = createBackendDatabase(config);
  const auth = createAuthService({ db: database.db, hankoApiUrl: config.hankoApiUrl });
  const llm = createLlmService(config);
  const googleApi = createGoogleApiService(config);

  return {
    config,
    database,
    db: database.db,
    auth,
    llm,
    googleApi,
  };
}
