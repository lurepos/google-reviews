import { defineConfig } from 'drizzle-kit';
const databaseUrl = (process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres').trim();

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
