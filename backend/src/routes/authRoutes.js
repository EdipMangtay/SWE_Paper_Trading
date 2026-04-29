// src/routes/authRoutes.js

const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('username').isString().isLength({ min: 3, max: 30 }),
    body('password').isString().isLength({ min: 6 }).withMessage('Password >= 6 chars')
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').isString().notEmpty()
  ],
  validate,
  authController.login
);

router.get('/me', authenticate, authController.me);

module.exports = router;
