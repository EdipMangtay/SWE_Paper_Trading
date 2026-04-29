// src/controllers/marketController.js

const marketDataService = require('../services/marketDataService');

const marketController = {
  async getPrices(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
      const coins = await marketDataService.getTopCoins(limit);
      res.json({ coins });
    } catch (err) { next(err); }
  },

  async getCoin(req, res, next) {
    try {
      const coin = await marketDataService.getCoin(req.params.coinId);
      res.json({ coin });
    } catch (err) { next(err); }
  },

  async getHistory(req, res, next) {
    try {
      const days = parseInt(req.query.days || '7', 10);
      const history = await marketDataService.getHistory(req.params.coinId, days);
      res.json({ history });
    } catch (err) { next(err); }
  },

  async search(req, res, next) {
    try {
      const q = req.query.q || '';
      const results = await marketDataService.searchCoins(q);
      res.json({ results });
    } catch (err) { next(err); }
  }
};

module.exports = marketController;
