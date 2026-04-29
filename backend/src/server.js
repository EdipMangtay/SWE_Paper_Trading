// src/server.js
// Entry point: connect DB, start HTTP server, schedule limit-order worker.

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { connectDB } = require('./config/db');
const orderService = require('./services/orderService');
const User = require('./models/User');
const Portfolio = require('./models/Portfolio');

const demoUsers = [
  { email: 'admin@papertrading.com',  username: 'admin',   password: 'admin123',   role: 'admin'  },
  { email: 'alice@example.com',       username: 'alice',   password: 'alice123',   role: 'trader' },
  { email: 'bob@example.com',         username: 'bob',     password: 'bob123',     role: 'trader' },
  { email: 'charlie@example.com',     username: 'charlie', password: 'charlie123', role: 'trader' }
];

async function ensureDemoUsers() {
  // In-memory MongoDB is ephemeral; keep the app usable by auto-seeding in dev
  // when the DB is empty.
  if (env.NODE_ENV === 'production') return;
  const existing = await User.countDocuments();
  if (existing > 0) return;

  for (const data of demoUsers) {
    const user = await User.create(data);
    await Portfolio.create({ user: user._id, assets: [] });
  }
  logger.info(`Seeded demo users: ${demoUsers.map((u) => u.email).join(', ')}`);
}

async function start() {
  await connectDB();
  await ensureDemoUsers();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}  (${env.NODE_ENV})`);
  });

  // Limit order worker - runs every 30s
  const intervalMs = 30_000;
  const worker = setInterval(async () => {
    try {
      const r = await orderService.processPendingLimitOrders();
      if (r.filled || r.expired) {
        logger.info(`Limit worker: checked=${r.checked} filled=${r.filled} expired=${r.expired}`);
      }
    } catch (e) {
      logger.error('Limit worker error:', e.message);
    }
  }, intervalMs);

  function shutdown(sig) {
    logger.info(`${sig} received, shutting down`);
    clearInterval(worker);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
