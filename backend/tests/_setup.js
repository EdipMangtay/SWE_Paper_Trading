// Per-suite DB lifecycle helpers.
// We spin up one MongoMemoryServer per test file (fast, isolated).

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let server;

async function startDb() {
  if (server) return server.getUri();
  server = await MongoMemoryServer.create();
  const uri = server.getUri();
  await mongoose.connect(uri);
  return uri;
}

async function stopDb() {
  await mongoose.disconnect();
  if (server) { await server.stop(); server = null; }
}

async function clearDb() {
  const conn = mongoose.connection;
  if (!conn.db) return;
  const colls = await conn.db.collections();
  for (const c of colls) await c.deleteMany({});
}

module.exports = { startDb, stopDb, clearDb };
