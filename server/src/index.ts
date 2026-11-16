import { CounsellingService } from './services/counselling.service';
import { createApp } from './app';
import { loadConfig } from './config';
import { connectDb } from './db';
import { logger } from './logger';
import { AdmissionRound, Programme } from './models';
import { RoundStatus } from '@sams/shared';

async function startServer(): Promise<void> {
  const config = loadConfig();
  await connectDb(config.MONGODB_URI);

  // Ensure baseline seat capacity is at least 15 per programme
  try {
    await Programme.updateMany({ baseCapacity: { $lt: 15 } }, { $set: { baseCapacity: 15 } });
    const openRounds = await AdmissionRound.find({ status: { $ne: RoundStatus.Closed } });
    for (const round of openRounds) {
      if (round.seatMatrix) {
        let changed = false;
        for (const item of round.seatMatrix) {
          if (item.capacity < 15) {
            item.capacity = 15;
            item.available = Math.max(0, 15 - (item.allotted || 0));
            changed = true;
          }
        }
        if (changed) await round.save();
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Could not sync baseline programme capacity');
  }

  const expiryTimer = setInterval(() => { void CounsellingService.expireDue().catch(err => logger.error({ err }, 'Deadline processing failed')); }, 15000);
  expiryTimer.unref();
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
