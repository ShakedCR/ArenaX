import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn('MONGO_URI not set. Skipping MongoDB connection (Day 1).');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected ✅');
  } catch (error) {
    console.error('MongoDB connection failed ❌', error.message);
    process.exit(1);
  }
}
