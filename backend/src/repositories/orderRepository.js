// src/repositories/orderRepository.js

const Order = require('../models/Order');

const orderRepository = {
  create: (data) => Order.create(data),

  findById: (id) => Order.findById(id),

  findByUser: (userId, filter = {}) =>
    Order.find({ user: userId, ...filter }).sort({ createdAt: -1 }),

  findPendingLimitOrders: () =>
    Order.find({ status: 'PENDING', type: 'LIMIT' }),

  updateStatus: (id, patch) =>
    Order.findByIdAndUpdate(id, patch, { new: true }),

  count: (filter = {}) => Order.countDocuments(filter)
};

module.exports = orderRepository;
