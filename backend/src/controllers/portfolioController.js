// src/controllers/portfolioController.js

const portfolioService = require('../services/portfolioService');

const portfolioController = {
  async get(req, res, next) {
    try {
      const data = await portfolioService.getPortfolio(req.user.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  async history(req, res, next) {
    try {
      const txs = await portfolioService.getTransactions(req.user.id);
      res.json({ transactions: txs });
    } catch (err) { next(err); }
  },

  async stats(req, res, next) {
    try {
      const stats = await portfolioService.getStats(req.user.id);
      res.json(stats);
    } catch (err) { next(err); }
  }
};

module.exports = portfolioController;
