// src/repositories/userRepository.js
// Repository pattern: isolates Mongoose calls so the service layer
// doesn't talk to the ORM directly. Makes swap-out and testing easier.

const User = require('../models/User');

const userRepository = {
  findById: (id) => User.findById(id),
  findByEmail: (email) => User.findOne({ email: email.toLowerCase() }).select('+password'),
  findByUsername: (username) => User.findOne({ username }),

  create: (data) => User.create(data),

  updateBalance: (userId, newBalance) =>
    User.findByIdAndUpdate(userId, { cashBalance: newBalance }, { new: true }),

  list: (filter = {}) => User.find(filter).sort({ createdAt: -1 }),

  setActive: (userId, isActive) =>
    User.findByIdAndUpdate(userId, { isActive }, { new: true }),

  count: () => User.countDocuments()
};

module.exports = userRepository;
