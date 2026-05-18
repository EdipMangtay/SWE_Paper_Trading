// portfolio.test.js — valuation, holdings, transaction history.

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

beforeAll(async () => { await startDb(); });
afterAll(async () => { await stopDb(); });
beforeEach(async () => {
  await clearDb();
  marketStub.__state.coins.bitcoin.current_price  = 50000;
  marketStub.__state.coins.ethereum.current_price = 3000;
});

describe('GET /api/portfolio', () => {
  it('returns initial state for a brand-new user', async () => {
    const { token } = await registerUser();
    const res = await request(app).get('/api/portfolio').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.cashBalance).toBe(100000);
    expect(res.body.assetsValue).toBe(0);
    expect(res.body.totalValue).toBe(100000);
    expect(res.body.holdings).toHaveLength(0);
    expect(res.body.totalPnl).toBe(0);
  });

  it('reflects mark-to-market value and unrealized P&L after a buy', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: 0.5 }); // 25 000 spent

    // Price rallies +20 %
    marketStub.__state.coins.bitcoin.current_price = 60000;

    const res = await request(app).get('/api/portfolio').set(auth(token));
    const h = res.body.holdings[0];

    expect(h.currentPrice).toBe(60000);
    expect(h.value).toBeCloseTo(0.5 * 60000, 2);    // 30 000
    expect(h.cost).toBeCloseTo(0.5 * 50000, 2);     // 25 000
    expect(h.pnl).toBeCloseTo(5000, 2);
    expect(h.pnlPct).toBeCloseTo(20, 2);

    // totalValue = cash 75 000 + assets 30 000 = 105 000
    expect(res.body.cashBalance).toBeCloseTo(75000, 2);
    expect(res.body.totalValue).toBeCloseTo(105000, 2);
    expect(res.body.totalPnl).toBeCloseTo(5000, 2);
  });

  it('handles multi-asset portfolios', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin',  type: 'MARKET', side: 'BUY', quantity: 0.1 });
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'ethereum', type: 'MARKET', side: 'BUY', quantity: 2   });

    const res = await request(app).get('/api/portfolio').set(auth(token));
    expect(res.body.holdings).toHaveLength(2);
    const symbols = res.body.holdings.map((h) => h.symbol).sort();
    expect(symbols).toEqual(['BTC', 'ETH']);
  });

  it('removes the asset from holdings once fully sold', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY',  quantity: 0.1 });
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'SELL', quantity: 0.1 });

    const res = await request(app).get('/api/portfolio').set(auth(token));
    expect(res.body.holdings).toHaveLength(0);
    expect(res.body.cashBalance).toBeCloseTo(100000, 2);
  });
});

describe('GET /api/portfolio/history', () => {
  it('returns immutable transaction records for every fill', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: 0.05 });
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'SELL', quantity: 0.05 });

    const res = await request(app).get('/api/portfolio/history').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(2);
    const sides = res.body.transactions.map((t) => t.side).sort();
    expect(sides).toEqual(['BUY', 'SELL']);
  });
});

describe('GET /api/portfolio/stats', () => {
  it('aggregates trade volume correctly', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'BUY', quantity: 0.05 }); // 2 500
    await request(app).post('/api/orders').set(auth(token))
      .send({ coinId: 'bitcoin', type: 'MARKET', side: 'SELL', quantity: 0.05 }); // 2 500

    const res = await request(app).get('/api/portfolio/stats').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.totalTrades).toBe(2);
    expect(res.body.buyCount).toBe(1);
    expect(res.body.sellCount).toBe(1);
    expect(res.body.buyVolume).toBeCloseTo(2500, 2);
    expect(res.body.sellVolume).toBeCloseTo(2500, 2);
    expect(res.body.totalVolume).toBeCloseTo(5000, 2);
  });
});
