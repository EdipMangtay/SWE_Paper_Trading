// src/repositories/portfolioRepository.js
// All portfolio reads/writes go through here.

const Portfolio = require('../models/Portfolio');

const portfolioRepository = {
  findByUser: (userId) => Portfolio.findOne({ user: userId }),

  createForUser: (userId) => Portfolio.create({ user: userId, assets: [] }),

  /**
   * Get or create portfolio. New users won't have one until first trade.
   */
  findOrCreate: async (userId) => {
    let pf = await Portfolio.findOne({ user: userId });
    if (!pf) pf = await Portfolio.create({ user: userId, assets: [] });
    return pf;
  },

  save: (portfolio) => portfolio.save(),

  listAll: () => Portfolio.find().populate('user', 'username email cashBalance')
};

module.exports = portfolioRepository;
