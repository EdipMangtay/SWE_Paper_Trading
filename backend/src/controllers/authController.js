// src/controllers/authController.js
// Thin HTTP layer. No business rules here: just translate request -> service -> response.

const authService = require('../services/authService');

const authController = {
  async register(req, res, next) {
    try {
      const { email, username, password } = req.body;
      const result = await authService.register({ email, username, password });
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.json(result);
    } catch (err) { next(err); }
  },

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      res.json({ user });
    } catch (err) { next(err); }
  }
};

module.exports = authController;
