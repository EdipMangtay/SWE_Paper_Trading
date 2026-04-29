// src/repositories/transactionRepository.js

const Transaction = require('../models/Transaction');

const transactionRepository = {
  create: (data) => Transaction.create(data),

  findByUser: (userId) =>
    Transaction.find({ user: userId }).sort({ createdAt: -1 }),

  count: (filter = {}) => Transaction.countDocuments(filter),

  totalVolume: async () => {
    const result = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    return result[0]?.total || 0;
  }
};

module.exports = transactionRepository;
