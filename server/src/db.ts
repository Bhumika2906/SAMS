import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDb(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
