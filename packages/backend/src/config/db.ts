import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb(): Promise<void> {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}
