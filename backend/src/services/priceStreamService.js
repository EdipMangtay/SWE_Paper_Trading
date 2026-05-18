// Real-time price streamer over WebSocket.
//
// Strategy: keep one upstream poll loop (every PRICE_STREAM_INTERVAL_MS) for
// the union of coinIds subscribed by *any* connected client, then fan-out
// updates to subscribers. This keeps the CoinGecko request rate predictable
// regardless of how many browser tabs are open.

const { WebSocketServer } = require('ws');
const marketDataService = require('./marketDataService');
const logger = require('../utils/logger');

const INTERVAL_MS = parseInt(process.env.PRICE_STREAM_INTERVAL_MS || '5000', 10);

let wss = null;
let pollTimer = null;
/** Map<coinId, number>  ref-counted subscriber set */
const subscriberCount = new Map();
/** Map<WebSocket, Set<coinId>> */
const clientSubs = new WeakMap();
/** last broadcast snapshot so new clients get an immediate value */
let lastPrices = {};

function trackedCoins() {
  return Array.from(subscriberCount.keys());
}

function broadcast(message) {
  if (!wss) return;
  const payload = JSON.stringify(message);
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(payload); } catch (_) { /* ignore */ }
    }
  }
}

async function pollOnce() {
  const ids = trackedCoins();
  if (!ids.length) return;
  try {
    const prices = await marketDataService.getPriceMap(ids, { forStream: true });
    // Keep only fresh, non-null prices so a transient upstream miss never
    // overwrites a previously good value (no UI flicker to "—").
    const fresh = {};
    for (const [id, p] of Object.entries(prices)) {
      if (p != null && !Number.isNaN(p)) fresh[id] = p;
    }
    if (!Object.keys(fresh).length) return;
    const ts = Date.now();
    lastPrices = { ...lastPrices, ...fresh };
    broadcast({ type: 'prices', ts, prices: fresh });
  } catch (err) {
    logger.warn(`priceStream poll failed: ${err.message}`);
  }
}

function handleSubscribe(ws, coinIds = []) {
  if (!Array.isArray(coinIds)) return;
  const subs = clientSubs.get(ws) || new Set();
  for (const id of coinIds) {
    if (typeof id !== 'string' || !id) continue;
    if (!subs.has(id)) {
      subs.add(id);
      subscriberCount.set(id, (subscriberCount.get(id) || 0) + 1);
    }
  }
  clientSubs.set(ws, subs);

  const known = {};
  for (const id of subs) if (lastPrices[id] != null) known[id] = lastPrices[id];
  if (Object.keys(known).length) {
    try {
      ws.send(JSON.stringify({ type: 'prices', ts: Date.now(), prices: known, snapshot: true }));
    } catch (_) { /* ignore */ }
  }

  pollOnce().catch(() => {});
}

function handleUnsubscribe(ws, coinIds = []) {
  const subs = clientSubs.get(ws);
  if (!subs) return;
  for (const id of coinIds) {
    if (subs.delete(id)) {
      const left = (subscriberCount.get(id) || 0) - 1;
      if (left <= 0) subscriberCount.delete(id);
      else subscriberCount.set(id, left);
    }
  }
}

function handleDisconnect(ws) {
  const subs = clientSubs.get(ws);
  if (!subs) return;
  for (const id of subs) {
    const left = (subscriberCount.get(id) || 0) - 1;
    if (left <= 0) subscriberCount.delete(id);
    else subscriberCount.set(id, left);
  }
  clientSubs.delete(ws);
}

const priceStreamService = {
  /**
   * Attach a WebSocket server on /ws to the given HTTP server.
   * Idempotent — repeated calls are a no-op.
   */
  attach(httpServer) {
    if (wss) return wss;
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }
        if (!msg || typeof msg !== 'object') return;

        if (msg.action === 'subscribe')   handleSubscribe(ws, msg.coinIds);
        else if (msg.action === 'unsubscribe') handleUnsubscribe(ws, msg.coinIds);
        else if (msg.action === 'ping')        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      });

      ws.on('close', () => handleDisconnect(ws));
      ws.on('error', () => handleDisconnect(ws));

      try {
        ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
      } catch (_) { /* ignore */ }
    });

    // Heartbeat to clean up half-open sockets
    const heartbeat = setInterval(() => {
      for (const ws of wss.clients) {
        if (ws.isAlive === false) { try { ws.terminate(); } catch (_) {} continue; }
        ws.isAlive = false;
        try { ws.ping(); } catch (_) {}
      }
    }, 30_000);

    pollTimer = setInterval(() => { pollOnce().catch(() => {}); }, INTERVAL_MS);

    wss.on('close', () => {
      clearInterval(heartbeat);
      clearInterval(pollTimer);
    });

    logger.info(`WebSocket price stream attached at /ws (interval=${INTERVAL_MS}ms)`);
    return wss;
  },

  stop() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (wss) { wss.close(); wss = null; }
  }
};

module.exports = priceStreamService;
