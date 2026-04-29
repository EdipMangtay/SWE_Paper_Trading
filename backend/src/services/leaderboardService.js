// src/services/leaderboardService.js
// Ranks users by total portfolio value (cash + holdings at live prices).

const portfolioRepository = require('../repositories/portfolioRepository');
const marketDataService   = require('./marketDataService');
const env                 = require('../config/env');

const leaderboardService = {
  /**
   * @param {String} sort  - 'value' (default) | 'pnlPct'
   * @param {Number} limit
   */
  async getLeaderboard(sort = 'value', limit = 50) {
    const portfolios = await portfolioRepository.listAll();

    // Collect all coin ids across all portfolios
    const idSet = new Set();
    for (const p of portfolios) {
      for (const a of p.assets) idSet.add(a.coinId);
    }
    const priceMap = await marketDataService.getPriceMap([...idSet]);

    const rows = portfolios
      .filter((p) => p.user) // skip orphaned portfolios
      .map((p) => {
        const cash = p.user.cashBalance ?? 0;
        let assetsValue = 0;
        for (const a of p.assets) {
          const cp = priceMap[a.coinId] ?? a.avgBuyPrice;
          assetsValue += a.quantity * cp;
        }
        const totalValue = cash + assetsValue;
        const pnl = totalValue - env.INITIAL_BALANCE;
        const pnlPct = env.INITIAL_BALANCE > 0 ? (pnl / env.INITIAL_BALANCE) * 100 : 0;
        return {
          username: p.user.username,
          email: p.user.email,
          cashBalance: cash,
          assetsValue,
          totalValue,
          pnl,
          pnlPct
        };
      });

    rows.sort((a, b) => {
      if (sort === 'pnlPct') return b.pnlPct - a.pnlPct;
      return b.totalValue - a.totalValue;
    });

    return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }));
  }
};

module.exports = leaderboardService;
