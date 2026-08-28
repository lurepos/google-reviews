import { loadNudeConfig, type NudeConfig } from '@lurepos/nude-core';

export interface BackendConfig extends NudeConfig {
  databaseUrl: string;
  hankoApiUrl: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optionalEnv(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
  return env[name]?.trim() || fallback;
}

export function loadBackendConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const nudeConfig = loadNudeConfig(env, {
    apiPrefix: '/api',
  });

  return {
    ...nudeConfig,
    databaseUrl: optionalEnv(env, 'DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/postgres'),
    hankoApiUrl: optionalEnv(env, 'HANKO_API_URL', 'https://mock.hanko.io').replace(/\/$/, ''),
    openaiApiKey: optionalEnv(env, 'OPENAI_API_KEY', 'mock-key'),
    openaiBaseUrl: optionalEnv(env, 'OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    openaiModel: optionalEnv(env, 'OPENAI_MODEL', 'gpt-4o-mini'),
    googleClientId: optionalEnv(env, 'GOOGLE_CLIENT_ID', 'mock-google-client-id'),
    googleClientSecret: optionalEnv(env, 'GOOGLE_CLIENT_SECRET', 'mock-google-client-secret'),
    googleRedirectUri: optionalEnv(env, 'GOOGLE_REDIRECT_URI', 'http://localhost:8080/api/auth/google/callback'),
  };
}
