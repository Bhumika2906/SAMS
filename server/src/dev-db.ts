import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function startDevDb() {
  try {
    const dbPath = resolve(process.cwd(), '.sams-db');
    mkdirSync(dbPath, { recursive: true });
    const mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, name: 'sams-rs' },
      instanceOpts: [{
        port: 27018,
        dbPath,
      }],
    });
    console.log(`\n=========================================`);
    console.log(`Local MongoDB running at: ${mongod.getUri()}`);
    console.log(`Port: 27018 | Database: sams`);
    console.log(`Keep this terminal running during your demo.`);
    console.log(`=========================================\n`);
  } catch (err) {
    console.error('Failed to start dev database:', err);
    process.exitCode = 1;
  }
}

startDevDb();
