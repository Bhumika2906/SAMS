import { MongoMemoryServer } from 'mongodb-memory-server';

async function startDevDb() {
  try {
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'sams',
      },
    });
    console.log(`\n=========================================`);
    console.log(`Local MongoDB running at: ${mongod.getUri()}`);
    console.log(`Port: 27017 | Database: sams`);
    console.log(`Keep this terminal running during your demo.`);
    console.log(`=========================================\n`);
  } catch (err) {
    console.error('Failed to start dev database:', err);
  }
}

startDevDb();
