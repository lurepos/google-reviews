import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { createNudeApp, routePath, type NudeApp } from '@lurepos/nude-http';
import type { BackendDependencies } from './dependencies.js';
import createAuthRoutes from './routes/auth.js';
import createLocationsRoutes from './routes/locations.js';
import createReviewsRoutes from './routes/reviews.js';

export function createApp(dependencies: BackendDependencies): NudeApp {
  const app = createNudeApp({
    logger: true,
    readinessChecks: [
      {
        name: 'database',
        check: () => dependencies.database.ping(),
      },
    ],
  });

  // Setup CORS
  void app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Setup Cookie
  void app.register(cookie, {
    secret: 'google-reviews-secret-cookie-signing-key',
    parseOptions: {},
  });

  // Register Routes
  const apiPrefix = dependencies.config.apiPrefix;

  void app.register(createAuthRoutes(dependencies), {
    prefix: apiPrefix,
  });

  void app.register(createLocationsRoutes(dependencies), {
    prefix: apiPrefix,
  });

  void app.register(createReviewsRoutes(dependencies), {
    prefix: apiPrefix,
  });

  return app;
}
