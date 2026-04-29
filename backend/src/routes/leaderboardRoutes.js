// src/routes/leaderboardRoutes.js
// Leaderboard is public so the landing page can show top traders.

const router = require('express').Router();
const leaderboardController = require('../controllers/leaderboardController');

router.get('/', leaderboardController.get);

module.exports = router;
