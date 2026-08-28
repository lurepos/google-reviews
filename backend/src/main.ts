import { NudeLifecycle } from '@lurepos/nude-core';
import { createApp } from './app.js';
import { loadBackendConfig } from './config.js';
import { createBackendDependencies } from './dependencies.js';
import { logger } from './utils/logger.js';

async function start(): Promise<void> {
  logger.info('System', 'Starting up Google Reviews API...');
  const config = loadBackendConfig();
  const dependencies = createBackendDependencies(config);
  const app = createApp(dependencies);
  const lifecycle = new NudeLifecycle();

  lifecycle.add(dependencies.database.close);
  lifecycle.add(() => app.close());

  let stopping = false;
  async function stop(signal: string): Promise<void> {
    if (stopping) return;
    stopping = true;
    logger.info('System', 'Stopping Google Reviews application', { signal });
    await lifecycle.close();
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void stop(signal).catch((error) => {
        logger.error('System', 'Failed to stop Google Reviews application', {
          error: error instanceof Error ? error.message : String(error),
        });
        process.exitCode = 1;
      });
    });
  }

  try {
    const port = Number(process.env.PORT || config.port || 8080);
    const host = process.env.HOST || config.host || '0.0.0.0';
    await app.listen({ host, port });
    logger.info('Server', `Listening at http://${host}:${port}`);
  } catch (error) {
    logger.error('System', 'Failed to start Google Reviews application', {
      error: error instanceof Error ? error.message : String(error),
    });
    try {
      await lifecycle.close();
    } catch (closeError) {
      logger.error('System', 'Failed to close Google Reviews resources', {
        error: closeError instanceof Error ? closeError.message : String(closeError),
      });
    }
    process.exitCode = 1;
  }
}

void start().catch((error) => {
  logger.error('System', 'Fatal error during startup', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
