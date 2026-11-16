import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryReplSet | null = null;

export async function setupTestDb(): Promise<void> {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  await mongoose.connect(uri, { retryWrites: false });
}

export async function clearTestDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      const collection = collections[key];
      if (collection) {
        await collection.deleteMany({});
      }
    }
  }
}

export async function teardownTestDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
