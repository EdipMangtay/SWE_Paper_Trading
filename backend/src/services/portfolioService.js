// src/services/portfolioService.js
// Computes portfolio valuation, P&L per asset and total, mark-to-market with live prices.

const portfolioRepository   = require('../repositories/portfolioRepository');
const userRepository        = require('../repositories/userRepository');
const transactionRepository = require('../repositories/transactionRepository');
const marketDataService     = require('./marketDataService');
const { EPS }               = require('../utils/positionMath');

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
    const holdings = portfolio.assets
      .map((a) => {
        const longQty = a.quantity || 0;
        const shortQty = a.shortQuantity || 0;
        const hasLong = longQty > EPS;
        const hasShort = shortQty > EPS;
        const cp = priceMap[a.coinId];
        const currentPrice =
          cp != null && !Number.isNaN(cp)
            ? cp
            : (hasLong ? a.avgBuyPrice : (hasShort ? (a.avgShortPrice || 0) : a.avgBuyPrice));

        const longValue = longQty * currentPrice;
        const shortLiab = shortQty * currentPrice;
        const longCost = longQty * (a.avgBuyPrice || 0);
        const shortEntry = shortQty * (a.avgShortPrice || 0);
        const pnlLong = longValue - longCost;
        const pnlShort = shortEntry - shortLiab;
        const pnl = pnlLong + pnlShort;
        const exposureCost = longCost + shortEntry;
        const pnlPct = exposureCost > 0 ? (pnl / exposureCost) * 100 : 0;
        const netValue = longValue - shortLiab;
        assetsValue += netValue;

        return {
          symbol: a.symbol,
          coinId: a.coinId,
          name: a.name,
          quantity: longQty,
          shortQuantity: shortQty,
          avgBuyPrice: a.avgBuyPrice,
          avgShortPrice: a.avgShortPrice || 0,
          currentPrice,
          value: netValue,
          cost: exposureCost,
          pnl,
          pnlPct,
          pnlLong,
          pnlShort,
          positionSide: hasLong && hasShort ? 'MIXED' : hasShort ? 'SHORT' : 'LONG',
          openedAt:    a.openedAt    || a.lastTradeAt || null,
          lastTradeAt: a.lastTradeAt || a.openedAt   || null
        };
      })
      .filter((h) => h.quantity > EPS || h.shortQuantity > EPS);

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
