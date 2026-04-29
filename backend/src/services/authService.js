// src/services/authService.js
// Business logic for register/login. Issues JWTs.

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const portfolioRepository = require('../repositories/portfolioRepository');

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, username: user.username },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

const authService = {
  async register({ email, username, password }) {
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) throw httpError(409, 'Email already in use');

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) throw httpError(409, 'Username already in use');

    const user = await userRepository.create({ email, username, password });
    await portfolioRepository.createForUser(user._id);

    const token = signToken(user);
    return { user, token };
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw httpError(401, 'Invalid credentials');
    if (!user.isActive) throw httpError(403, 'Account is disabled');

    const ok = await user.comparePassword(password);
    if (!ok) throw httpError(401, 'Invalid credentials');

    const token = signToken(user);
    // Strip password before returning
    user.password = undefined;
    return { user, token };
  },

  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw httpError(404, 'User not found');
    return user;
  }
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = authService;
