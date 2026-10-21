import { createApp } from './app';
import { loadConfig } from './config';
import { connectDb } from './db';
import { logger } from './logger';

async function startServer(): Promise<void> {
  const config = loadConfig();
  await connectDb(config.MONGODB_URI);

  const app = createApp();
  app.listen(config.PORT, '0.0.0.0', () => {
    logger.info(`SAMS Server listening on port ${config.PORT} (env: ${config.NODE_ENV})`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    logger.error({ err }, 'Failed to start SAMS Server');
    process.exit(1);
  });
}

export { createApp, startServer };
