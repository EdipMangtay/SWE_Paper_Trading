// src/routes/orderRoutes.js

const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const orderController = require('../controllers/orderController');

router.use(authenticate);

router.post(
  '/',
  [
    body('coinId').isString().notEmpty(),
    body('type').isIn(['MARKET', 'LIMIT']),
    body('side').isIn(['BUY', 'SELL']),
    body('quantity').isFloat({ gt: 0 }),
    body('price').optional().isFloat({ gt: 0 })
  ],
  validate,
  orderController.create
);

router.get('/', orderController.list);
router.delete('/:id', orderController.cancel);

module.exports = router;
