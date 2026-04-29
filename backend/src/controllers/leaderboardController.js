// src/controllers/leaderboardController.js

const leaderboardService = require('../services/leaderboardService');

const leaderboardController = {
  async get(req, res, next) {
    try {
      const sort  = req.query.sort  || 'value';
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
      const rows = await leaderboardService.getLeaderboard(sort, limit);
      res.json({ leaderboard: rows });
    } catch (err) { next(err); }
  }
};

module.exports = leaderboardController;
