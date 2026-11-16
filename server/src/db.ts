import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDb(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  const topology = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error('SAMS requires MongoDB transactions. Start npm run db and set MONGODB_URI=mongodb://127.0.0.1:27018/sams?replicaSet=sams-rs in server/.env, then restart the API.');
  }
  logger.info('MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
