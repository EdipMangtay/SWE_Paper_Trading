// src/services/portfolioService.js
// Computes portfolio valuation, P&L per asset and total, mark-to-market with live prices.

const portfolioRepository   = require('../repositories/portfolioRepository');
const userRepository        = require('../repositories/userRepository');
const transactionRepository = require('../repositories/transactionRepository');
const marketDataService     = require('./marketDataService');

const portfolioService = {
  async getPortfolio(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const e = new Error('User not found'); e.status = 404; throw e;
    }
    const portfolio = await portfolioRepository.findOrCreate(userId);

    const ids = portfolio.assets.map((a) => a.coinId);
    const priceMap = await marketDataService.getPriceMap(ids);

    let assetsValue = 0;
    const holdings = portfolio.assets.map((a) => {
      const currentPrice = priceMap[a.coinId] ?? a.avgBuyPrice;
      const value = a.quantity * currentPrice;
      const cost  = a.quantity * a.avgBuyPrice;
      const pnl   = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      assetsValue += value;
      return {
        symbol: a.symbol,
        coinId: a.coinId,
        name: a.name,
        quantity: a.quantity,
        avgBuyPrice: a.avgBuyPrice,
        currentPrice,
        value,
        cost,
        pnl,
        pnlPct
      };
    });

    const totalValue = user.cashBalance + assetsValue;
    // Use process.env directly to avoid a circular import
    const initial = parseFloat(process.env.INITIAL_BALANCE || '100000');
    const totalPnl = totalValue - initial;
    const totalPnlPct = initial > 0 ? (totalPnl / initial) * 100 : 0;

    return {
      cashBalance: user.cashBalance,
      assetsValue,
      totalValue,
      totalPnl,
      totalPnlPct,
      holdings
    };
  },

  async getTransactions(userId) {
    return transactionRepository.findByUser(userId);
  },

  async getStats(userId) {
    const txs = await transactionRepository.findByUser(userId);
    const buys  = txs.filter((t) => t.side === 'BUY');
    const sells = txs.filter((t) => t.side === 'SELL');
    const buyVolume  = buys.reduce((s, t) => s + t.total, 0);
    const sellVolume = sells.reduce((s, t) => s + t.total, 0);
    return {
      totalTrades: txs.length,
      buyCount: buys.length,
      sellCount: sells.length,
      buyVolume,
      sellVolume,
      totalVolume: buyVolume + sellVolume
    };
  }
};

module.exports = portfolioService;
