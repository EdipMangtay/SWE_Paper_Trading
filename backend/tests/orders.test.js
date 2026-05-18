// orders.test.js — market/limit order lifecycle + close position.

// Mock the CoinGecko-backed market data service so tests are hermetic and
// the price is deterministic. The factory exposes __state so individual tests
// can mutate prices to trigger limit fills / P&L scenarios.
jest.mock('../src/services/marketDataService', () => {
  const state = {
    coins: {
      bitcoin:  { id: 'bitcoin',  symbol: 'BTC', name: 'Bitcoin',  image: '', current_price: 50000 },
      ethereum: { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: '', current_price: 3000  }
    }
  };
  return {
    __state: state,
    async getCoin(id) {
      const c = state.coins[id];
      if (!c) { const e = new Error('Coin not found'); e.status = 404; throw e; }
      return { ...c };
    },
    async getTopCoins() { return Object.values(state.coins); },
    async getHistory() { return []; },
    async getPriceMap(ids) {
      const out = {};
      for (const id of ids) out[id] = state.coins[id]?.current_price ?? null;
      return out;
    },
    async searchCoins() { return []; }
  };
});

const { startDb, stopDb, clearDb } = require('./_setup');
const { request, app, registerUser, auth } = require('./_helpers');
const marketStub = require('../src/services/marketDataService');
const orderService = require('../src/services/orderService');

beforeAll(async () => { await startDb(); });
afterAll(async () => { await stopDb(); });
beforeEach(async () => {
  await clearDb();
  marketStub.__state.coins.bitcoin.current_price  = 50000;
  marketStub.__state.coins.ethereum.current_price = 3000;
});

describe('Authorization', () => {
  it('rejects unauthenticated POST /api/orders', async () => {
    const res = await request(app).post('/api/orders').send({
      coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: 0.1
    });
    expect(res.status).toBe(401);
  });
});

describe('MARKET orders', () => {
  it('fills a MARKET BUY immediately and decrements cash', async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .post('/api/orders')
      .set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: 0.1 });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('FILLED');
    expect(res.body.order.executedPrice).toBe(50000);

    const pf = await request(app).get('/api/portfolio').set(auth(token));
    expect(pf.body.cashBalance).toBe(100000 - 0.1 * 50000); // 95 000
    expect(pf.body.holdings).toHaveLength(1);
    expect(pf.body.holdings[0].symbol).toBe('BTC');
    expect(pf.body.holdings[0].quantity).toBe(0.1);
    expect(pf.body.holdings[0].openedAt).toBeTruthy();
  });

  it('rejects a BUY with insufficient cash', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: 100 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Insufficient/i);
  });

  it('rejects a SELL without holding', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'SELL', quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Insufficient asset/i);
  });

  it('weighted-average cost basis: buying twice averages the entry', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: 0.1 }); // @ 50 000

    marketStub.__state.coins.bitcoin.current_price = 60000;

    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: 0.1 }); // @ 60 000

    const pf = await request(app).get('/api/portfolio').set(auth(token));
    const h = pf.body.holdings[0];
    expect(h.quantity).toBeCloseTo(0.2, 8);
    expect(h.avgBuyPrice).toBeCloseTo(55000, 0);
  });
});

describe('LIMIT orders', () => {
  it('a BUY @ price above market fills immediately ("in the money")', async () => {
    const { token } = await registerUser();
    const res = await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'LIMIT', side: 'BUY', quantity: 0.01, price: 60000 });
    // Limit BUY fills when market <= limit; market is 50 000 ≤ 60 000 ⇒ fills.
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('FILLED');
  });

  it('a BUY @ price below market stays PENDING then fills via the worker', async () => {
    const { token } = await registerUser();
    const created = await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'LIMIT', side: 'BUY', quantity: 0.01, price: 40000 });
    expect(created.body.order.status).toBe('PENDING');

    // Price crashes — worker should now fill it.
    marketStub.__state.coins.bitcoin.current_price = 39000;
    const r = await orderService.processPendingLimitOrders();
    expect(r.filled).toBe(1);

    const list = await request(app).get('/api/orders?status=FILLED').set(auth(token));
    expect(list.body.orders).toHaveLength(1);
    expect(list.body.orders[0].executedPrice).toBe(39000);
  });

  it('a PENDING order can be cancelled by its owner', async () => {
    const { token } = await registerUser();
    const created = await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'LIMIT', side: 'BUY', quantity: 0.01, price: 30000 });
    expect(created.body.order.status).toBe('PENDING');

    const cancelled = await request(app)
      .delete(`/api/orders/${created.body.order._id}`).set(auth(token));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.order.status).toBe('CANCELLED');
  });
});

describe('POST /api/orders/close — close position at market', () => {
  it('closes the full position and reports realized P&L', async () => {
    const { token } = await registerUser();

    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'ethereum', type: 'MARKET', side: 'BUY', quantity: 2 }); // @ 3 000

    marketStub.__state.coins.ethereum.current_price = 3500;

    const closed = await request(app).post('/api/orders/close').set(auth(token))
      .send({ coinId: 'ethereum' });

    expect(closed.status).toBe(201);
    expect(closed.body.realizedPnl).toBeCloseTo((3500 - 3000) * 2, 2);
    expect(closed.body.entryPrice).toBe(3000);
    expect(closed.body.exitPrice).toBe(3500);

    const pf = await request(app).get('/api/portfolio').set(auth(token));
    expect(pf.body.holdings).toHaveLength(0);
    // Started at 100 000 → spent 6 000 → received 7 000 = 101 000
    expect(pf.body.cashBalance).toBeCloseTo(101000, 2);
  });

  it('returns 404 when there is no open position to close', async () => {
    const { token } = await registerUser();
    const res = await request(app).post('/api/orders/close').set(auth(token))
      .send({ coinId: 'bitcoin' });
    expect(res.status).toBe(404);
  });
});

describe('Input validation', () => {
  it('rejects unknown order types with 400', async () => {
    const { token } = await registerUser();
    const res = await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'STOP', side: 'BUY', quantity: 0.01 });
    expect(res.status).toBe(400);
  });

  it('rejects non-positive quantity', async () => {
    const { token } = await registerUser();
    const res = await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: -1 });
    expect(res.status).toBe(400);
  });
});
