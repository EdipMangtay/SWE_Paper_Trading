// src/routes/portfolioRoutes.js

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const portfolioController = require('../controllers/portfolioController');

router.use(authenticate);

router.get('/',         portfolioController.get);
router.get('/history',  portfolioController.history);
router.get('/stats',    portfolioController.stats);

module.exports = router;
