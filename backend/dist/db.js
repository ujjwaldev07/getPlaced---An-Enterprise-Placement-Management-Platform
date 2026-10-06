import mongoose from 'mongoose';
import { config } from './config.js';
export async function connectDB() {
    await mongoose.connect(config.mongo);
    console.log('MongoDB connected');
}
