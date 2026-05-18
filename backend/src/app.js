// src/app.js
// Application Layer wire-up: middleware, routes, error handling.
// Server lifecycle (DB connect, listen, background jobs) lives in server.js.

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');

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
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

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

// Unknown /api routes return JSON 404 (otherwise the SPA fallback below would
// serve index.html for them, which would be misleading for API consumers).
app.use('/api', notFound);

// Single-service deployment: serve the built SPA from ../public (placed there
// by the multi-stage Dockerfile). Falls back to index.html for any non-API
// route so React Router can take over client-side.
const distPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: '1y', etag: true, index: false }));
  app.get(/^(?!\/api|\/ws).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Final catch-all + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
