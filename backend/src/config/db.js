// src/config/db.js
// MongoDB connection logic. Single source of truth for DB lifecycle.

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let memoryServer = null;

async function connectDB() {
  try {
    if (env.MONGODB_URI) {
      await mongoose.connect(env.MONGODB_URI);
      logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    }

    if (env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is required in production');
    }

    // Dev fallback: auto-start an ephemeral in-memory MongoDB so the project
    // runs out of the box on machines without Docker/MongoDB installed.
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    logger.info(`MongoDB (in-memory) started: ${uri}`);
  } catch (err) {
    logger.error('MongoDB connection error:', err.message);
    // Soft-fail in development so the API still starts; hard-fail in production.
    if (env.NODE_ENV === 'production') process.exit(1);
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err.message));
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
  } finally {
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
  }
}

module.exports = { connectDB, disconnectDB };
