// src/controllers/adminController.js

const userRepository        = require('../repositories/userRepository');
const orderRepository       = require('../repositories/orderRepository');
const transactionRepository = require('../repositories/transactionRepository');

const adminController = {
  async listUsers(req, res, next) {
    try {
      const users = await userRepository.list();
      res.json({ users });
    } catch (err) { next(err); }
  },

  async toggleUserActive(req, res, next) {
    try {
      const { isActive } = req.body;
      const user = await userRepository.setActive(req.params.id, !!isActive);
      res.json({ user });
    } catch (err) { next(err); }
  },

  async stats(req, res, next) {
    try {
      const [userCount, orderCount, txCount, totalVolume] = await Promise.all([
        userRepository.count(),
        orderRepository.count(),
        transactionRepository.count(),
        transactionRepository.totalVolume()
      ]);
      res.json({
        users: userCount,
        orders: orderCount,
        transactions: txCount,
        totalVolume
      });
    } catch (err) { next(err); }
  }
};

module.exports = adminController;
