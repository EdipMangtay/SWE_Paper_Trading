// src/controllers/orderController.js

const orderService = require('../services/orderService');

const orderController = {
  async create(req, res, next) {
    try {
      const order = await orderService.createOrder(req.user.id, req.body);
      res.status(201).json({ order });
    } catch (err) { next(err); }
  },

  async list(req, res, next) {
    try {
      const orders = await orderService.listUserOrders(req.user.id, req.query.status);
      res.json({ orders });
    } catch (err) { next(err); }
  },

  async cancel(req, res, next) {
    try {
      const order = await orderService.cancelOrder(req.user.id, req.params.id);
      res.json({ order });
    } catch (err) { next(err); }
  }
};

module.exports = orderController;
