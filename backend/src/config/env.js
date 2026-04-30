// src/config/env.js
// Centralized environment configuration. Loaded once at startup.

require('dotenv').config();

const env = {
  // Default 5002: macOS often reserves 5000 (AirPlay / Control Center)
  PORT: parseInt(process.env.PORT || '5002', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Leave empty by default so development can auto-start an in-memory MongoDB
  // when the user doesn't have MongoDB/Docker installed locally.
  MONGODB_URI: process.env.MONGODB_URI || '',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  INITIAL_BALANCE: parseFloat(process.env.INITIAL_BALANCE || '100000'),

  COINGECKO_BASE_URL: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
  PRICE_CACHE_TTL: parseInt(process.env.PRICE_CACHE_TTL || '60', 10),

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173'
};

module.exports = env;
