// src/routes/marketRoutes.js
// Market data is public (no auth required) so the landing page can show prices.

const router = require('express').Router();
const marketController = require('../controllers/marketController');

router.get('/prices',          marketController.getPrices);
router.get('/search',          marketController.search);
router.get('/:coinId',         marketController.getCoin);
router.get('/:coinId/history', marketController.getHistory);

module.exports = router;
