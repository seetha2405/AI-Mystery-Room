import mongoose from 'mongoose';
import { connectDatabase, friendlyDatabaseError } from './config/db.js';

try {
  await connectDatabase();
  await mongoose.disconnect();
  process.exit(0);
} catch {
  console.error(friendlyDatabaseError());
  process.exit(1);
}
