// src/routes/adminRoutes.js

const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.use(authenticate, requireAdmin);

router.get('/users',           adminController.listUsers);
router.patch('/users/:id',     adminController.toggleUserActive);
router.get('/stats',           adminController.stats);

module.exports = router;
