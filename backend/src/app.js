// src/app.js
// Application Layer wire-up: middleware, routes, error handling.
// Server lifecycle (DB connect, listen, background jobs) lives in server.js.

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes        = require('./routes/authRoutes');
const marketRoutes      = require('./routes/marketRoutes');
const orderRoutes       = require('./routes/orderRoutes');
const portfolioRoutes   = require('./routes/portfolioRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const adminRoutes       = require('./routes/adminRoutes');

const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), env: env.NODE_ENV })
);

// API routes
app.use('/api/auth',        authRoutes);
app.use('/api/market',      marketRoutes);
app.use('/api/orders',      orderRoutes);
app.use('/api/portfolio',   portfolioRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin',       adminRoutes);

// 404 + error handler must be last
app.use(notFound);
app.use(errorHandler);

module.exports = app;
